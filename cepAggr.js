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
var util = require('util');

//custom helper functions
var buildLambda = require("./helperFunctions.js").buildLambda;

//queries
const aggregQuery = "SELECT %s FROM ? %s";
const aggregQueryGroupBy = "SELECT %s FROM ? %s GROUP BY %s";
const aggregQueryGroupByHaving = "SELECT %s FROM ? %s GROUP BY %s HAVING %s";

module.exports = function(RED) {

    function cepAggr(config) {
      RED.nodes.createNode(this, config);

  		var node = this;
      //message that will be probably passed on the flow
      var msg = {};

      //getting the values from html
      node.filters = config.filters || [];
      node.property = config.property || "payload";
      node.eventType = config.eventType || "";
      node.windowType = config.windowType || "counter";
      node.windowParam = config.windowParam || 0;

      node.avgAlias = config.avgAlias || "avgAggr";
      node[node.avgAlias] = config.avg;
      node[`${node.avgAlias}Field`] = config.avgField ? `AVG(${config.avgField})` : "";

      node.countAlias = config.countAlias || "countAggr";
      node[node.countAlias] = config.count;
      node[`${node.countAlias}Field`] = config.countField ? `COUNT(${config.countField})` : "COUNT(*)";

      node.maxAlias = config.maxAlias || "maxAggr";
      node[node.maxAlias] = config.max;
      node[`${node.maxAlias}Field`] = config.maxField ? `MAX(${config.maxField})` : "";

      node.medianAlias = config.medianAlias || "medianAggr";
      node[node.medianAlias] = config.median;
      node[`${node.medianAlias}Field`] = config.medianField ? `MEDIAN(${config.medianField})` :  "";

      node.minAlias = config.minAlias || "minAggr";
      node[node.minAlias] = config.min;
      node[`${node.minAlias}Field`] = config.minField ? `MIN(${config.minField})` :  "";

      node.stdevAlias = config.stdevAlias || "stdevAggr";
      node[node.stdevAlias] = config.stdev;
      node[`${node.stdevAlias}Field`] = config.stdevField ? `STDEV(${config.stdevField})` : "";

      node.sumAlias = config.sumAlias || "sumAggr";
      node[node.sumAlias] = config.sum;
      node[`${node.sumAlias}Field`] = config.sumField ? `SUM(${config.sumField})` : "";

      node.varianceAlias = config.varianceAlias || "varAggr";
      node[node.varianceAlias] = config.variance;
      node[`${node.varianceAlias}Field`] = config.varianceField ? `VAR(${config.varianceField})` : "";

      node.newEvent = config.newEvent || "aggregateEvent";
      node.fieldsList = config.fieldsList || [];

      node.groupby = config.groupby;
      node.having = config.having;

      if(node.windowParam > 0){

        var aliases = [node.avgAlias, node.countAlias, node.maxAlias, node.medianAlias,
                        node.minAlias, node.stdevAlias, node.sumAlias, node.varianceAlias];
        var aggregateSelect = "", separator = "";

        for(let i = 0; i < aliases.length; i++){
          if(node[aliases[i]] && node[`${aliases[i]}Field`]){
            aggregateSelect += (separator + node[`${aliases[i]}Field`] + " AS " + aliases[i]);
            separator = ", ";
          }
        }

        if(node.fieldsList.length > 0){
          node.fieldsList.forEach(function(data){
            if(data.alias){
              aggregateSelect += (`${separator}${data.field} AS ${data.alias}`);
              separator = ", ";
            }else if(data.field){
              aggregateSelect += (separator + data.field);
              separator = ", ";
            }
          });
        }

        if(aggregateSelect){
          //builds the query
          var query = aggregQuery;
          if(node.groupby){
            if(node.having){
              query = aggregQueryGroupByHaving;
              query = util.format(query, aggregateSelect, node.eventType, node.groupby, node.having);
            }else{
              query = aggregQueryGroupBy;
              query = util.format(query, aggregateSelect, node.eventType, node.groupby);
            }
          }else{
            query = util.format(query, aggregateSelect, node.eventType);
          }

          //creates a mapping function according to property informed by the user
          var mapping = safeEval(buildLambda(`msg.${node.property};`, "msg"));

          //creates and evaluates filtering function
          for(let i in node.filters){
            node.filters[i] = safeEval(buildLambda(node.filters[i], node.eventType));
          }

          //creates an Observable/stream from input event and maps each emition of msg to msg.[property] (informed by the user)
          var inputEvent = Rx.Observable.fromEvent(node, 'input').map(mapping);

          //filtering operations
          for(let i in node.filters){
            inputEvent = inputEvent.filter(node.filters[i]);
          }

          //selects the window
          switch (node.windowType) {
            case "timer": //Time Window
              inputEvent = inputEvent.windowTime(node.windowParam).concatMap(x => x.toArray());
              break;
            default: //Count Window
              inputEvent = inputEvent.windowCount(node.windowParam).concatMap(x => x.toArray());
          }

          inputEvent.subscribe({
            next: emitedWindow =>{
              //making sure that the window has really output values
              if(emitedWindow && emitedWindow.length > 0){
                var result = alasql(query, [emitedWindow]);
                _.forEach(result, (obj) => {
                  msg.event = {eventType: node.newEvent};
                  _.forEach(obj, (value, key) => {
                    if(value != undefined){
                      if(_.isNumber(value)){
                        msg.event[key] = _.round(value, 10);
                      }else{
                        msg.event[key] = value;
                      }
                    }
                  });
                  //sends message
                  node.send(msg);
                });
              }
            },
            error: err => node.error('Error: ' + err),
            complete: () => {}
        });
      }
      }
    }
    RED.nodes.registerType("cepAggr", cepAggr);
}
