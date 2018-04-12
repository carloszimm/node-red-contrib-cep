node-red-contrib-cep
===================

![Sense hat example](https://drive.google.com/uc?export=view&id=1zAplcD5qfqH_MGuaH68Wj2ceZmrY7gaY)
<b><i><sup>Sense hat simulation example</sup></i></b>

node-red-contrib-cep is a package that bundles a set of Node-RED nodes that can be used to perform complex event processing (CEP) operations.

Currently, there are three nodes implemented that represent three different CEP patterns:

 - aggregation: performs aggregation
 - join: joins events from two different events
 - pattern: checks pattern against events from two different events

Motivation
------
We have reached an era that more and more new devices embedded with actuators and sensors are being produced and connected on the world wide web. In fact, studies have pointed out that, on the next 50 years, the numbers of devices that will be connected on the Internet will reach the billion range. As a result, more and more data and events will be generated what makes a perfect ground for the concepts of CEP to come in. The idea is to empower node-red users with some CEP operations at hand in which can be used to create more intuitive event-based applications and to generate more meaningful composed events.

Installation
------
To install the package, just run the following command in your Node-RED user
directory (normally `~/.node-red`):

    npm install node-red-contrib-cep

Notes of Implementation
------
The main two modules that play the role of orchestrating the application are [RxJS](https://github.com/ReactiveX/RxJS "RxJS") and [AlaSQL](https://github.com/agershun/alasql "AlaSQL"). I have decided to go with RxJS since its main purpose is to manipulate streams of events. Besides, it offers an incredible toolbox of functions to be used on those stream, such as combine, filter, etc. Moreover, great companies support its reactive programming model, such as Microsoft, NetFlix, etc. On the other hand, AlaSQL combines the power of SQL on Javascript taking into account speed as one of its main concerns. Among its functionalities, it offer the ability to run SQL on JS arrays. Hence, I have joined the best of both to create something similar to current CEP implementations, mostly based on Queries, behind the scene empowered by the data flow programming offered by node-RED.

> **Note:** AlaSQL was used as a helper to implement the functionalities. In the future, however, the tendency is that it will be slowly replaced by RxJS as Rx is extended with new operations.

Usage
------
Just like any node-RED node, you just need to drag the desired node and drop on the main canvas/flow. However, as a requirement, every `msg` containing the event's data under its properties (payload for instance) have to have a property called eventType that will be used to identify and serve as alias on the nodes' options. Also, all event properties must be on a single object relative to `msg` such as `msg.payload` or `msg.event` for example. That being said, a temperature reading could be carried on the payload like  `msg.payload.temperature` and be referred inside the node as `SensorReading.temperature` (supposing that "SensorReading" was actually the name in the `msg.payload.eventType` property and was informed on the Event Type option inside the node as well).

> **Note:** Since node-RED uses nodeJS on the background, all syntax behind the node logic follows the Javascript variable identifiers rules. So, there will be situations where you can create aliases for your computations, fields, etc. For those situations, you should follow the JS naming rules to create your aliases.

Following there is a table that shows the available option of each node.

|   Node      | Available Options | Number of Events|
| :-------    | :---- |  :----: |
| aggregation    | Property, Event Type, Window,<br />Window Parameter,Group By, Having,<br />Filter, AVG, COUNT, MAX,<br />MEDIAN, MIN, STDEV, SUM,<br />VAR, Generated Event,<br />Selected Fields| 1 |
| join    | Property, Event Type #1, Window,<br />Window Parameter, Event Type #2,<br />Window, Window Parameter, Filter,<br />Join Clause, Generated Event,<br />Selected Fields| 2 |
| pattern | Property, Event Type #1,<br />Event Type #2, Window,<br />Window Parameter, filter,<br />Pattern, Join Clause,<br />Generated Event, Selected Fields| 2 |

The following list summarizes the available current options present on the nodes. Notice that not all mentioned options bellow are included on every node.

 - Property
	 - Type: String
	 - Default Value: `msg.payload`
	 - Required: true.
	 - Description: Indicates which object on `msg` carries the event information.
 - Event Type
	 - Type: String
	 - Default Value: `undefined`
	 - Required: true.
	 - Description: The event type that represents a set of events sharing the same purpose and structure. It is used to refer to attributes on the objects that carry the events'  properties. The user must insert, if not present, a eventType attribute and assign to it a name corresponding to the event type. For example, if the `msg.payload` carries the event's data, this payload must have as well a `msg.payload.eventType`. On the node's properties, to refer to a attribute of `msg.payload` and supposing that `msg.payload.eventType` is equal to "TemperatureReading", the user only needs to write `TemperatureReading.[attribute]`. If the node supports more than one event, next to the event type label there will be a # followed by a number to indicate the first or second event.
 - Window
     - Type: Dropdown/ string
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
	 - Default Value: `undefined`/empty
	 - Required: false
	 - Description: The user is allowed to specify filtering expressions that, as the name implies, will filter the events before they are stored on the window. You can inform any valid JS logical expression, i.e. you are allowed to make combinations of `>, <, ==, &&, ||` for example.
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
     - Type: Dropdown/ string/ string
	 - Default Value: `AVG (average)/undefined/avgAggr (name of operator + Aggr)`
	 - Required: false
	 - Description: The currently available aggregate operations(functions) are: AVG (average), COUNT, MAX (maximum), MEDIAN, MIN (minimum), STDEV (standard deviation), SUM, VAR (variance). They are all organized with three parts: a dropdown to indicate which operation to be carried out, an input field (labeled field) that indicates which field the operation should work with, and an alias that will be used to name the result on the event generated.
 - Join Clause:
     - Type: String
	 - Default Value: `undefined`
	 - Required: true (available on node join and node pattern)
	 - Description: It enables a user to inform an expression that contains fields of both events and should be used to bind events together. Hence, the user the user can select fields presents on both events.
	  - **Note:** Currently, only the inner join (old friend of SQL programmers) is performed in the CEP join node. More join operators will be available soon.
 - Pattern:
     - Type: String
	 - Default Value: `undefined`
	 - Description: This field enables a user to create some patten to be checked on the events stored on the window. Currently, there are three operators that can be used to form a pattern: AND, OR and __,__ (__all capitalized__). The last operator , (comma) is used to indicate followed by pattern. Since the node only works on 2 events, the possibilities are: `eventA AND eventB`, `eventA OR eventB`, `eventA, eventB` or `eventB, eventA` (eventA and eventB indicates the type of the #1 and #2 events respectively).
	  - **Note:** followed by ( , ) indicates the order the events arrived on the node.
 - Generated Event:
     - Type: String
	 - Default Value: `"nodeOperationEvent"`
	 - Description: This field indicates the the type of the new event generated. It will be assign to `msg.event.eventType` as new events are output. If no new event's type is informed, the default type shall be operation+Event, e.g. aggregationEvent.
 - Selected Fields:
     - Type: List/string/string
	 - Default Value: `empty`
	 - Description: A list of event's fields that should be included on the output event. It is quite useful in the case at which there are some fields that should be replicated on the new generated event. Just like SQL, aliases are available allowing to set up how the name of the field will be on the new event. Notice that if no alias is provided, the same name of the field will be used, without the preceding eventType. Be aware that, if 'Selected Fields' is used on the  aggregation node, it may not be output if it is not included on the group by clause (I will investigate if it is the correct behavior of the auxiliary modules or not). If no selected field is informed, the only field that is output for sure is the new event type (Generated Event), in other words it is an optional field.

> **Note 1:** All new output event's data is included relative to `msg.event`.

> **Note 2:** All properties (in most cases) should be preceded by the eventType to be referred.

> **Note 3:** AND or OR in pattern node should be capitalized.

> **Note 4:** For the equality in Join and Having clause, it can be used the JS equality sign ==  as well as the SQL single equal sign = . However, on the Filter operation, you are allowed only to use the JS manner. So, in any case, prefer the use of == to avoid unsurprising results.

Future Releases
------
I intend on future releases to bring more features to the nodes, and, also, to create new ones that implement other CEP patterns/functionalities. Besides, I will be doing the properly enhancements in order to prioritize processing. Notice that I did not do any stress testing yet or measure the memory consumption on extreme situations either. Instead, I have trusted on the promise of the two main libraries, RxJS and AlaSQL. They both focus on speed and performance. Not to mention, RxJS was rewritten not long ago in order to enhance performance, modularity, and debuggable call stacks.  

Example
------
On the link bellow, you can find a simple example (google drive folder with JSON files containing the flows and screenshots). To use it, you just need to install the following nodes: [node-red-node-pi-sense-hat-simulator](https://github.com/node-red/node-red-nodes/tree/master/hardware/sensehatsim), [Repeat NodeRED Node](https://github.com/arnauorriols/node-red-contrib-repeat), and [node-red-dashboard](https://github.com/node-red/node-red-dashboard), and then import the flows on your node-RED. Basically, what it does is to take the temperature e humidity readings from sense hat simulator and calculate the standard deviation on both readings that were accumulated during a certain time by using the `aggregation` node. After that I check those deviations to see if the temperature or humidity have oscillated beyond a tolerance by applying filters and pattern checks (tempDeviation OR humdityDeviation) of the `pattern` node. If both were output, an alert in red is blinked on the led grid of the sense hat. Otherwise, if only one of them, a yellow alert is blinked instead. Moreover, utilizing a MQTT nodes, I simulated the sending of some of those data to a "remote" (this flow can also be found on the example folder) device that shows all of this data in the form of charts utilizing the node-red-dashboard to render those charts in a dashboard. Just like the alert on the sense hat that blinks, an alert is triggered on the dashboard too in the form of both a top right modal alert with color border depending on the type of alert (yellow or red) and alert voice informing a message as well.

- [google drive folder](https://drive.google.com/drive/folders/0BzfGWK0OB5yhWXloRnhaOFBhNmc?usp=sharing)

> **Note:** To use the MQTT nodes/protocol, I leveraged the free broker[HiveMQ Public Broker](http://www.hivemq.com/try-out/).

Contact
------
Please, feel free to contact me through my <a href="mailto:cezl@cin.ufpe.br?subject=[cep-nodes] ">email</a> (place in front of the subject "[cep-nodes]") if you have any question, suggestion, or anything regarding the nodes. Also, you can open an issue if you come across a problem.

License
------
The MIT License (MIT)

Copyright (c) 2018 CeZL

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
