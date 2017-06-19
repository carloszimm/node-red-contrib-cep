node-red-contrib-cep
===================

node-red-contrib-cep is a package that bundles a set of Node-RED nodes that can be used to perform complex event processing (CEP) operations.

Currently, there are three nodes implemented that represent three different CEP patterns:

 - cep aggr: performs aggregation
 - cep join: joins events from two different nodes
 - cep pattern: checks pattern against events from two different nodes

Motivation
------
We have reached an era that more and more new devices are being produced and connected on the world wide web. In fact, studies have pointed out that, on the next 50 years, the numbers of devices that will be connected on the Internet will reach the billion range. As a result, an enormous quantity of data will be produced what makes a perfect ground for the concepts of CEP to come in. That being said, my idea is to empower node-red users with some CEP operations at hand in which can be used to create more intuitive applications and, as a result, generate more meaningful composed events.

Installation
------
To install the package, just run the following command in your Node-RED user
directory (normally `~/.node-red`):

    npm install node-red-contrib-cep

Notes of Implementation
------
The main two modules that play the role of orchestrating the application are [RxJS](https://github.com/ReactiveX/RxJS "RxJS") and [AlaSQL](https://github.com/agershun/alasql "AlaSQL"). I have decided to go with RxJS since its main purpose is to manipulate streams of events. Besides, it offers an incredible toolbox of functions to be used on those stream, such as combine, filter, etc. Moreover, great companies support its reactive programming model, such as Microsoft, NetFlix, etc. On the other hand, AlaSQL combines the power of SQL on Javascript taking into account speed as one of its main concerns. Among its functionalities, it offer the ability to run SQL on JS arrays. Hence, I have joined the best of both to create something similar to current CEP implementations, mostly based on Queries, behind the scene empowered by the data flow programming offered by node-RED.

Usage
------
Just like any node-RED node, you just need to drag the desired node and drop on the main canvas/flow. However, as a requirement, every `msg` containing the event's data under its properties (payload for instance) have to have a property called eventName that will be used to identify and serve as alias on the nodes' options. Also, all event properties must be on a single object relative to `msg` such as `msg.payload` or `msg.event` for example. That being said, a temperature reading could be carried on the payload like  `msg.payload.temperature` and be referred inside the node as `SensorReading.temperature` (supposing that "SensorReading" was actually the name of the `msg.payload.eventName` property and was informed on the Event Name option inside the node as well).

> **Note:** Since node-RED uses nodeJS on the background, all syntax behind the node logic follows the Javascript variable identifiers rules. So, there will be situations where you can create aliases for your computations, fields, etc. For those situations, you should follow the JS naming rules to create your aliases.

Following there is a table that shows the available option of each node.

|   Node      | Available Options | Number of Events|
| :-------    | :---- |  :----: |
| cep aggr    | Property, Event Name, Window,<br />Window Parameter,Group By, Having,<br />Filter, AVG, COUNT, MAX,<br />MEDIAN, MIN, STDEV, SUM,<br />VAR, Generated Event,<br />Selected Fields| 1 |
| cep join    | Property, Event Name #1, Window,<br />Window Parameter, Event Name #2,<br />Window, Window Parameter, Filter,<br />Join Clause, Generated Event,<br />Selected Fields| 2 |
| cep pattern | Property, Event Name #1,<br />Event Name #2, Window,<br />Window Parameter, filter,<br />Pattern, Join Clause,<br />Generated Event, Selected Fields| 2 |

The following list summarizes the available current options present on the nodes. Notice that not all mentioned options bellow are included on every node.

 - Property
	 - Type: String
	 - Default Value: `msg.payload`
	 - Required: true.
	 - Description: Indicates which object on `msg` carries the event information.
 - Event Name
	 - Type: String
	 - Default Value: `undefined`
	 - Required: true.
	 - Description: The event name that is used to refer to some attribute from the object that carries the event properties. The user must insert, if not present, a eventName attribute and assign to it a name. For example, if the `msg.payload` carries the event's data, this payload must have as well a  `msg.payload.eventName`. On the node properties, to refer to a attribute from `msg.payload` and supposing that `msg.payload.eventName` is equal to "TemperatureReading", the user only needs to write `TemperatureReading.[attribute]`. If the node supports more than one event, next  to the option's name will be a # followed by a number to indicate the first or second event.
 - Window
     - Type: Dropdown/ String
	 - Default Value:  `Count Window`
	 - Required: true
	 - Description: Window plays one of the most important roles on a CEP engine.  They are like table in SQL database, but instead of being a long term storage entity, they store events temporarily in order to accomplish some operation on the set. Currently, there are only two window options: Count Window and Time Window. As their name suggest, one will be storing items based on a fixed number, and the other on time basis.
 - Window Parameter
     - Type: String
	 - Default Value: `0`
	 - Required: true
	 - Description: It is used to inform how many events a Window should store or how long it should be collecting events. For both Count Window  and Time Window, the user should inform an integer number. The only difference is that, for the former case, it is equivalent to the number of events temporarily stored, and for the latter case, it indicates for how many **'milliseconds'** the window should store event data.
 - Filter
     - Type: String/List
	 - Default Value: `undefined`
	 - Required: false
	 - Description: The user is allowed to specify filtering expressions that, as the name says, will filter the events before they are stored on the window. You can inform any valid JS logical expression, i.e. you are allowed to make combinations of `>, <, ==, &&, ||` for example.
 - Group By
     - Type: String
	 - Default Value: `undefined`
	 - Required: false (true if the having clause is informed)
	 - Description: There may be cases in which you want to group event by their id (each ID could represent a different sensor) and to perform the calculations only on those group instead of the whole set stored by the chosen window. That is the purpose of Group By. For those familiar with SQL, the group by works essentially the same. You can indicate a comma separated list that contains the properties the engine should use to group the events.
 - Having
     - Type: String
	 - Default Value: `undefined`
	 - Required: false
	 - Description:  It works with GROUP BY and imposes a constraint based on aggregate function. The classical example is that you group a set of events by their id and want results being output only and only with the total number of events per group is greater than 2. To express that, you should follow the SQL style, with the aggregate function (see available options bellow) enclosing some event property plus the desired checking, e.g. COUNT(id) > 2 (\* wildcard is allowed just like SQL). Please, though is not a requirement for this option, avoid to use lower case aggregate function. It is important to follow this rule, since not all SQL-like options on the nodes are case insensitive.
 - Aggregation Operations:
     - Type: Checkbox/ String/ String
	 - Default Value: `undefined/undefined/name of operator + Aggr`
	 - Required: false
	 - Description: The currently available aggregate operations(functions) are: AVG (average), COUNT, MAX (maximum), MEDIAN, MIN (minimum), STDEV (standard deviation), SUM, VAR (variance). They are all organized with three parts: a checkbox to indicate that you want that operation to be carried out, a input field labeled field that indicates on which field that operation should be done, and an alias that will be used to name the result on the event generated.
 - Join Clause:
     - Type: String
	 - Default Value: `undefined`
	 - Required: true (available on node join and node pattern)
	 - Description: It enables a user to inform an expression that contains fields of both events and should be used to bind events together. Hence, the user the user can select fields presents on both events.
	  - **Note:** Currently, only the inner join (old friend of SQL programmers) is performed in the cep join node. More join operators will be available soon.
 - Pattern:
     - Type: String
	 - Default Value: `undefined`
	 - Description: This field enables a user to create some patten to be checked on the events stored on the window. Currently, there are three operators that can be used to form a pattern: AND, OR and __,__ (__all capitalized__). The last operator , (comma) is used to indicate followed by pattern. Since the node only works on 2 events, the possibilities are: `eventA AND eventB`, `eventA OR eventB`, `eventA, eventB` or `eventB, eventA` (eventA and eventB indicates the name of the #1 and #2 events respectively).
- **Note:** followed by ( , ) indicates the order the events arrived on the node.
 - Generated Event:
     - Type: String
	 - Default Value: `"nodeOperationEvent"`
	 - Description: This field indicates the the name of the new event generated. It will be assign to `msg.event.eventName` as new events are output. If no new event's name is informed, the default name shall be operation+Event, e.g. aggregationEvent.
 - Selected Fields:
     - Type: String
	 - Default Value: `undefined`
	 - Description: A comma separated list of event's fields that should be included on the output event. It is quite useful to replicate some information to be processed outside the node. Just like SQL, you can set aliases using the AS keyword + alias after the field. Hence, you can set up how the name of the field will be as soon as the new event is generate. Notice that if no alias is provide, the same name of the field will be used, not including the eventName. Be aware that, if 'Selected Fields' is used on the cep aggr (aggregation node), it may not be output if it is not included on the group by clause (I will investigate if it is the correct behavior of the auxiliary modules or not). If no selected field is informed, the only field that is output for sure is the new event name (Generated Event); this fact make the selected field option not required on all nodes.

> **Note 1:** All new output event's data is included relative to `msg.event`.

> **Note 2:** All properties (in most cases) should be preceded by the eventName to be referred.

> **Note 3:** AND or OR in pattern node should be capitalized.

> **Note 4:** For the equality in Join and Having clause, it can be used the JS equality sign ==  as well as the SQL single equal sign = . However, on the Filter operation, you are allowed only to use the JS manner. So, in any case, prefer the use of == to avoid unsurprising results.

Future Releases
------
I intend on future releases to bring more features to the nodes, and, also, to create new ones that implement other CEP patterns/functionalities. Besides, I will be doing the properly enhancements in order to prioritize processing. Notice that I did not do any stress testing yet or measure the memory consumption on extreme situations either. Instead, I have trusted on the promise of the two main libraries, RxJS and AlaSQL. They both focus on speed and performance. Not to mention, RxJS was rewritten not long ago in order to enhance performance, modularity, and debuggable call stacks.  

Example
------
On the example folder, you can find an example (the JSON that contains the flow) created by me that I have used to present my thesis during my graduation. To use it, you just need to install the following nodes: [node-red-node-pi-sense-hat-simulator](https://github.com/node-red/node-red-nodes/tree/master/hardware/sensehatsim), [Repeat NodeRED Node](https://github.com/arnauorriols/node-red-contrib-repeat), and [node-red-dashboard](https://github.com/node-red/node-red-dashboard), and import it on your node-RED GUI. Basically, what it does is to read take the temperature e humidity readings from sense hat simulator, calculate the standard deviation on both readings that were accumulated during a certain time, and, using the cep pattern node, I check those deviations to see if both the temperature or humidity have oscillated beyond a tolerance. If both of them oscillated (tempDeviation AND humdityDeviation), an alert in red is blinked on the led grid of the sense hat. Otherwise, if only one of them oscillated beyond the tolerance, a yellow alert is blinked instead. Moreover, utilizing a MQTT nodes, I simulated the sending of some of those data to a "remote" (this flow can also be found on the example folder) device that shows all of this data in the form of charts utilizing the node-red-dashboard to render those charts in a dashboard. Just like the alert on the sense hat that blinks, an alert is triggered on the dashboard too in the form of both a top right modal alert with color border depending on the type of alert (yellow or red) and alert voice informing a message as well.

> **Note:** To use the MQTT nodes/protocol, I utilized as a broker the free [HiveMQ Public Broker](http://www.hivemq.com/try-out/).

Acknowledgment
------
node-red-contrib-cep was conceive as part of my thesis during my graduation. I would like to thank my professor Kiev Gama for introducing me to the CEP concepts as well as this incredible tool called node-RED.

Also, I would like to thank all the third party libraries used on this project.

Contact
------
Please, feel free to contact me through my <a href="mailto:cezl@cin.ufpe.br?subject=[cep-nodes] ">email</a> (place in front of the subject "[cep-nodes]") if you have any question, suggestion, or anything regarding the nodes. Also, you can open an issue if you come across a problem.

License
------
The MIT License (MIT)

Copyright (c) 2017 Carlos Zimmerle

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
