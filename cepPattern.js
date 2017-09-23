/*
The MIT License (MIT)

Copyright (c) 2017 CeZL

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

//dependencies
var Rx = require('rxjs/Rx');
var safeEval = require('safe-eval');
var _ = require('lodash');
var alasql = require("alasql");
var pamatcher = require('pamatcher');
var booleanParser = require('boolean-parser');
var util = require('util');

//custom helper functions
var buildLambda = require("./helperFunctions.js").buildLambda;
var stringIdentifier = require("./helperFunctions.js").stringIdentifier;

//pseudo identifiers used to create event names that will be used on the processing and to insert timestamps to infer
//the order that the events arrive on the node
const pseudoEventType1 = stringIdentifier();
const pseudoEventType2 = stringIdentifier();

const pseudoTimestamp = stringIdentifier();
const pseudoTimestamp1 = stringIdentifier();
const pseudoTimestamp2 = stringIdentifier();

//query
const queryFullOuterJoin = `SELECT '%s' AS eventType, %s.eventType AS ${pseudoEventType1}, %s.eventType AS ${pseudoEventType2}, %s.${pseudoTimestamp} AS ${pseudoTimestamp1}, %s.${pseudoTimestamp} AS ${pseudoTimestamp2} %s FROM ? %s FULL OUTER JOIN ? %s ON %s`;

//pattern to be used on pamatcher
const pattern = "[{repeat: (x) => x}, %s, {repeat: (x) => x}]";

module.exports = function(RED) {

    function cepPattern(config) {
      RED.nodes.createNode(this, config);

  		var node = this;
      //message that will be passed on the flow
      var msg = {};

      //getting the values from html
      var filters = config.filters || [];
      node.property = config.property || "payload";
      node.eventType1 = config.eventType1;
      node.eventType2 = config.eventType2;
      node.windowType = config.windowType || "counter";
      node.windowParam = config.windowParam || 0;
      node.pattern = config.pattern;
      node.joinClause = config.joinClause;
      node.newEvent = config.newEvent || "patternEvent";
      node.fields = config.fields || "";

      if(node.windowParam > 0 && node.eventType1 && node.eventType2 && node.pattern && node.joinClause){

      var matcher, fullQuery, parsedPattern = "", parsedArray, parsedString, separator = "";

      var mapping = safeEval(buildLambda(`msg.${node.property}`, "msg"));

      //separates each filtering op, transform each one in function and evaluates them
      node.filterEvent1 = filters.filter(filterRule => filterRule.filterEvent == "Event#1");
      node.filterEvent2 = filters.filter(filterRule => filterRule.filterEvent == "Event#2");

      for(let i in node.filterEvent1){
        node.filterEvent1[i] = safeEval(buildLambda(`${node.filterEvent1[i].filterParameter}`, node.eventType1));
      }

      for(let i in node.filterEvent2){
        node.filterEvent2[i] = safeEval(buildLambda(`${node.filterEvent2[i].filterParameter}`, node.eventType2));
      }

      // preparing the query
      fullQuery = util.format(queryFullOuterJoin, node.newEvent, node.eventType1, node.eventType2, node.eventType1, node.eventType2, node.fields ? `, ${node.fields}`: node.fields, node.eventType1, node.eventType2, node.joinClause);

      //builds the pattern
      //each comma will be used as delimiter to build the pattern
      node.pattern = node.pattern.split(",");

      for(let i in node.pattern){
        parsedArray = booleanParser.parseBooleanQuery(node.pattern[i].trim());
        parsedString = JSON.stringify(parsedArray);

        if(parsedArray.length == 1){
          parsedPattern += (separator + parsedString);
        }else{
          parsedPattern += (separator + `{or: ${parsedString}}`);
        }

        separator = ", ";
      }
      parsedPattern = util.format(pattern, parsedPattern);
      parsedPattern = safeEval(parsedPattern);
      matcher = pamatcher(parsedPattern);

      //creates the Observable from input event and maps each emition of msg to msg.[property] (informed by the user)
      var inputEvent = Rx.Observable.fromEvent(node, 'input').map(mapping);

      //inserts a timestamp used to control data's arrival
      inputEvent = inputEvent.map(event => {event[pseudoTimestamp] = (+new Date()); return event});

      var eventStream1 = inputEvent.filter(event1 => event1.eventType == node.eventType1);
      var eventStream2 = inputEvent.filter(event2 => event2.eventType == node.eventType2);

      for(let i in node.filterEvent1){
        eventStream1 = eventStream1.filter(node.filterEvent1[i]);
      }

      for(let i in node.filterEvent2){
        eventStream2 = eventStream2.filter(node.filterEvent2[i]);
      }
      //merges both streams
      var combined = eventStream1.merge(eventStream2);

      //selects the window
      if(node.windowType && node.windowParam > 0){
        switch (node.windowType) {
          case "timer": //Time Window
            combined = combined.windowTime(node.windowParam);
            break;
          default: //Count Window
            combined = combined.windowCount(node.windowParam);
        }
      }

      combined.subscribe({
        next: (combinedStream) => {
          let arrayStream1 = combinedStream.filter(event1 => event1.eventType == node.eventType1).toArray();
          let arrayStream2 = combinedStream.filter(event2 => event2.eventType == node.eventType2).toArray();
          //subscribes to each stream and output both the results together
          var joinStream = Rx.Observable.zip(
                            arrayStream1,
                            arrayStream2
                          );
          joinStream.subscribe({
            next: (arrayStream) => {
              let array1 = arrayStream[0];
              let array2 = arrayStream[1];

              let joinResult = alasql(fullQuery, [array1, array2]);

              //loops trough each object output
              _.forEach(joinResult, (value) =>{
                //temporary objects to check the pattern
                let eventA = {eventType: value[pseudoEventType1], pseudoTimestamp: value[pseudoTimestamp1]};
                let eventB = {eventType: value[pseudoEventType2], pseudoTimestamp: value[pseudoTimestamp2]};
                let comb = [eventA, eventB];

                comb = _.orderBy(comb, ["pseudoTimestamp"], ["asc"]);
                //hack to prevent null since the pamatcher doesn't work with null but with undefined is ok
                eventA = comb[0].eventType? comb[0].eventType: undefined;
                eventB = comb[1].eventType? comb[1].eventType: undefined;
                comb = [eventA, eventB];

                let result = matcher.exec(comb);

                if(result.test){
                  //removes temporary values
                  value = _.omit(value, [pseudoEventType1, pseudoEventType2, pseudoTimestamp1, pseudoTimestamp2]);
                  //creates the event with the fields selected by the user
                  msg.event = value;
                  //sends the message to the output
                  node.send(msg);
                }
              });
            },
            error: err => node.error('Error: ' + err),
            complete: () => {}
          });
        }
      });

      }
    }
    RED.nodes.registerType("cepPattern", cepPattern);
}
