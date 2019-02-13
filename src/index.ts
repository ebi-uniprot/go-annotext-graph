import { LitElement, html } from "lit-element";
import * as d3Select from "d3-selection";
import * as force from "d3-force";
import * as d3Drag from "d3-drag";
import * as chromatic from "d3-scale-chromatic";

const url = "https://wwwdev.ebi.ac.uk/QuickGO/services/ontology/ae/relations";

type NodeDatum = {
  id: string;
  x: number;
  y: number;
  fx: number;
  fy: number;
};

type EdgeDatum = {
  source: NodeDatum;
  target: NodeDatum;
};

class GoAnnotextGraph extends LitElement {
  width = 1000;
  height = 900;
  data: { nodes: NodeDatum[]; edges: EdgeDatum[] } | undefined = undefined;
  colorScale = chromatic.schemeAccent;
  simulation: force.Simulation<NodeDatum, EdgeDatum> | undefined = undefined;
  link: any;
  node: any;

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
    this.simulation = force
      .forceSimulation(this.data.nodes)
      .force(
        "link",
        force
          .forceLink()
          .distance(100)
          .links(this.data.edges)
          .id(d => d.id)
      )
      .force("charge", force.forceManyBody().distanceMin(10))
      .force("center", force.forceCenter(this.width / 2, this.width / 2))
      .on("tick", this.ticked);

    this.initForceDisplay();
  }

  ticked = () => {
    this.link
      .attr("x1", (d: EdgeDatum) => d.source.x)
      .attr("y1", (d: EdgeDatum) => d.source.y)
      .attr("x2", (d: EdgeDatum) => d.target.x)
      .attr("y2", (d: EdgeDatum) => d.target.y)
      .attr("stroke", this.colorScale[0])
      .attr("stroke-width", 1);

    this.node.attr("transform", (d: NodeDatum) => `translate(${d.x}, ${d.y})`);
  };

  initForceDisplay = () => {
    if (this.shadowRoot === null || typeof this.data === "undefined") {
      return;
    }
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
      .selectAll("circle")
      .data(this.data.nodes)
      .enter()
      .append("g");

    // node circles
    this.node
      .append("circle")
      .attr("r", 5)
      .attr("fill", this.colorScale[1]);

    // node text
    this.node
      .append("text")
      .attr("dx", 12)
      .attr("dy", ".35em")
      .text((d: NodeDatum) => d.id);

    this.node.call(
      d3Drag
        .drag()
        .on("start", this.dragstarted)
        .on("drag", this.dragged)
        .on("end", this.dragended)
    );

    this.node.exit().remove();
    this.link.exit().remove();
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
