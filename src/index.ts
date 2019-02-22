import { LitElement, html } from "lit-element";
import * as d3Select from "d3-selection";
import * as force from "d3-force";
import * as ellipseForce from "d3-ellipse-force";
import * as d3Drag from "d3-drag";
import * as chromatic from "d3-scale-chromatic";

const url = "https://wwwdev.ebi.ac.uk/QuickGO/services/ontology/ae/relations";

type NodeDatum = {
  id: string;
  rx: number;
  ry: number;
  fx: number;
  fy: number;
};

type EdgeDatum = {
  source: NodeDatum;
  target: NodeDatum;
};

class GoAnnotextGraph extends LitElement {
  width = 1500;
  height = 900;
  data: { nodes: NodeDatum[]; edges: EdgeDatum[] } | undefined = undefined;
  colorScale = chromatic.schemeAccent;
  simulation: force.Simulation<NodeDatum, EdgeDatum> | undefined = undefined;
  link: any;
  node: any;
  text: any;

  static get properties() {
    return {
      data: {}
    };
  }

  async connectedCallback() {
    super.connectedCallback();
    const response = await fetch(url);
    this.data = await response.json();
  }

  updated() {
    if (typeof this.data === "undefined") {
      return;
    }
    this.initForceDisplay();
  }

  ticked = () => {
    this.link
      .attr("x1", (d: EdgeDatum) => {
        return d.source.x;
      })
      .attr("y1", (d: EdgeDatum) => d.source.y)
      .attr("x2", (d: EdgeDatum) => d.target.x)
      .attr("y2", (d: EdgeDatum) => d.target.y)
      .attr("stroke", this.colorScale[0])
      .attr("stroke-width", 1);

    this.node.attr("cx", d => d.x).attr("cy", d => d.y);
    this.text.attr("x", d => d.x).attr("y", d => d.y);
  };

  initForceDisplay = () => {
    if (this.shadowRoot === null || typeof this.data === "undefined") {
      return;
    }
    const dataWithSizes = this.data.nodes.map(d => {
      return { ...d, rx: d.id.length * 4.5, ry: 12 };
    });

    this.simulation = force
      .forceSimulation()
      .force("link", force.forceLink().id(d => d.id))
      .force("collide", ellipseForce.ellipseForce(6, 0.5, 5))
      .force("center", force.forceCenter(this.width / 2, this.width / 2));

    const svg = d3Select.select(
      this.shadowRoot.getElementById("annotext-graph")
    );
    // link lines
    this.link = svg
      .append("g")
      .selectAll("line")
      .data(this.data.edges)
      .enter()
      .append("line");

    // node groups
    this.node = svg
      .append("g")
      .selectAll("ellipse")
      .data(dataWithSizes)
      .enter()
      .append("ellipse")
      .attr("rx", d => d.rx)
      .attr("ry", d => d.ry)
      .attr("fill", this.colorScale[1])
      .call(
        d3Drag
          .drag()
          .on("start", this.dragstarted)
          .on("drag", this.dragged)
          .on("end", this.dragended)
      );

    // node text
    this.text = svg
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(dataWithSizes)
      .enter()
      .append("text")
      .attr("dy", 2)
      .attr("text-anchor", "middle")
      .text(function(d) {
        return d.id;
      })
      .attr("fill", "white");

    this.simulation.nodes(dataWithSizes).on("tick", this.ticked);
    this.simulation.force("link").links(this.data.edges);
  };

  dragstarted = d => {
    if (typeof this.simulation === "undefined") {
      return;
    }
    if (!d3Select.event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  };

  dragged = d => {
    d.fx = d3Select.event.x;
    d.fy = d3Select.event.y;
  };

  dragended = d => {
    if (typeof this.simulation === "undefined") {
      return;
    }
    if (!d3Select.event.active) this.simulation.alphaTarget(0.0001);
    d.fx = null;
    d.fy = null;
  };

  render() {
    return html`
      <style>
        :host {
          font-family: Helvetica, Arial, sans-serif;
          font-size: 10px;
        }
      </style>
      <svg
        id="annotext-graph"
        width="${this.width}"
        height="${this.height}"
      ></svg>
    `;
  }
}

customElements.define("go-annotext-graph", GoAnnotextGraph);
