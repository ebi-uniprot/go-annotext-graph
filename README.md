# go-annotext-graph

A web component to display the GO annotation extension relations as a graph. 

It gets the node information from https://www.ebi.ac.uk/QuickGO/services/ontology/ae/relations, 
and uses the D3 force layout to display it as a graph.

## How to install
```
npm i go-annotext-graph
```
D3 dependencies are global so you will need to explicitly include them in your code 

## How to use
Simply add the component to your code, no attributes needed
```
<go-annotext-graph/>
```
Once displayed, it will look like
[graph]: ./readmeImage.png "GO annotation extension relations"