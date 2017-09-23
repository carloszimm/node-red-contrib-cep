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
var alasql = require("alasql");
var _ = require('lodash');
var util = require('util');

//custom helper function
var buildLambda = require("./helperFunctions.js").buildLambda;

//query
const joinQuery = "SELECT '%s' AS eventName %s FROM ? %s INNER JOIN ? %s ON %s";

module.exports = function(RED) {

    function cepJoin(config) {
      RED.nodes.createNode(this, config);

  		var node = this;

      //message that will be passed on the flow
      var msg = {};

      //getting the values from html
      var filters = config.filters || [];
      node.property = config.property || "payload";
      node.eventName1 = config.eventName1;
      var windowType1 = config.windowType1 || "counter";
      var windowParam1 = config.windowParam1 || 0;
      node.eventName2 = config.eventName2;
      var windowType2 = config.windowType2 || "counter";
      var windowParam2 = config.windowParam2 || 0;
      node.joinClause = config.joinClause;
      node.newEvent = config.newEvent || "joinEvent";
      node.fields = config.fields || "";

      if(windowParam1 > 0 && windowParam2 > 0 && node.eventName1 && node.eventName2 && node.joinClause){
        node.windows = [];
        node.windows.push({"windowType": windowType1, "windowParam": windowParam1});
        node.windows.push({"windowType": windowType2, "windowParam": windowParam2});

        //creates a mapping function according to property informed by the user
        var mapping = safeEval(buildLambda(`msg.${node.property}`, "msg"));

        //split the filters set by the user to be applied on different stream/observables
        node.filterEvent1 = filters.filter(filterRule => filterRule.filterEvent == "Event#1");
        node.filterEvent2 = filters.filter(filterRule => filterRule.filterEvent == "Event#2");

        //creates the lambda/arrow functions for the filters
        for(let i in node.filterEvent1){
          node.filterEvent1[i] = safeEval(buildLambda(node.filterEvent1[i].filterParameter, node.eventName1));
        }

        for(let i in node.filterEvent2){
          node.filterEvent2[i] = safeEval(buildLambda(node.filterEvent2[i].filterParameter, node.eventName2));
        }

        //preparing the join query
        var query = util.format(joinQuery, node.newEvent, node.fields ? `, ${node.fields}`: node.fields, node.eventName1, node.eventName2, node.joinClause);

        //creates the observable/stream from input event and maps each emition of msg to msg.[property] (informed by the user)
        var inputEvent = Rx.Observable.fromEvent(node, 'input').map(mapping);
        var subject = new Rx.Subject();
        var multicasted = inputEvent.multicast(subject);

        //filters the main stream and separates it based on eventName
        var eventStream1 = multicasted.filter(event1 => event1.eventName == node.eventName1);

        var eventStream2 = multicasted.filter(event2 => event2.eventName == node.eventName2);

        //filters each stream
        for(let i in node.filterEvent1){
          eventStream1 = eventStream1.filter(node.filterEvent1[i]);
        }

        for(let i in node.filterEvent2){
          eventStream2 = eventStream2.filter(node.filterEvent2[i]);
        }

        //selects the window
        for(var i = 0; i < node.windows.length; i++){
          switch (node.windows[i].windowType) {
            case "timer": //Time Window
              if(i == 0){
                eventStream1 = eventStream1.windowTime(node.windows[i].windowParam);
              }else{
                eventStream2 = eventStream2.windowTime(node.windows[i].windowParam);
              }
              break;
            default: //Count Window
              if(i == 0){
                eventStream1 = eventStream1.windowCount(node.windows[i].windowParam);
              }else{
                eventStream2 = eventStream2.windowCount(node.windows[i].windowParam);
              }
          }
        }
        //subscribes to both stream and creates a new stream that will output both outputs from the two streams subscribed
        var joinStream = Rx.Observable.zip(
                          eventStream1.concatMap(x => x.toArray()),
                          eventStream2.concatMap(x => x.toArray())
                        );

        //subscribes to the stream that contains the result from the previous two streams
        joinStream.subscribe({
          next: (combinedStream) => {
            if(combinedStream && combinedStream.length == 2){
              //gets each array output from the joinStream
              var arrayEvent1 = combinedStream[0];
              var arrayEvent2 = combinedStream[1];

              if(arrayEvent1 && arrayEvent2){
                //performs the join operation
                let join = alasql(query, [arrayEvent1, arrayEvent2]);
                //loops through the array and sets each object that represents a join to the node.event reference
                _.forEach(join, value => {
                  msg.event = value;
                  //sends the message/event to the flow
                  node.send(msg);
                });
              }
            }
          },
          error: err => node.error('Error: ' + err),
          complete: () => {}
        });

        multicasted.connect();
      }
    }
    RED.nodes.registerType("cepJoin", cepJoin);
}
