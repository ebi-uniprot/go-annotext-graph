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
  svg: any;

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

    this.wrap();
  };

  initForceDisplay = () => {
    if (this.shadowRoot === null || typeof this.data === "undefined") {
      return;
    }
    const dataWithSizes = this.data.nodes.map(d => {
      return { ...d, rx: 50, ry: 28 };
    });

    this.simulation = force
      .forceSimulation()
      .force("link", force.forceLink().id(d => d.id))
      .force("collide", ellipseForce.ellipseForce(6, 0.5, 5))
      .force("center", force.forceCenter(this.width / 2, this.width / 2));

    this.svg = d3Select.select(
      this.shadowRoot.getElementById("annotext-graph")
    );
    // link lines
    this.link = this.svg
      .append("g")
      .selectAll("line")
      .data(this.data.edges)
      .enter()
      .append("line");

    // node groups
    this.node = this.svg
      .append("g")
      .selectAll("ellipse")
      .data(dataWithSizes)
      .enter()
      .append("ellipse")
      .attr("rx", d => d.rx)
      .attr("ry", d => d.ry)
      .attr("stroke", this.colorScale[1])
      .attr("fill", "transparent")
      .call(
        d3Drag
          .drag()
          .on("start", this.dragstarted)
          .on("drag", this.dragged)
          .on("end", this.dragended)
      );

    // node text
    this.text = this.svg
      .append("g")
      .attr("class", "labels")
      .selectAll("text")
      .data(dataWithSizes)
      .enter()
      .append("text")
      .attr("dy", 2)
      .attr("text-anchor", "middle")
      .text((d)  =>
        d.id.replace(/_/gi, " ").trim()
      )
      .attr("id", (d) => d.id)
      .attr("fill", "black");

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

  wrap() {
    const width = 80;

    this.svg.selectAll("tspan").remove();
    this.svg.selectAll("text")._groups[0].forEach((elem: any) => {
      let textNode = this.svg.select("#" + elem.id),
        words = elem.id.replace(/_/gi, " ").trim().split(/\s+/).reverse(),
        word,
        line = [],
        lineHeight = 1.1, //em
        x = textNode.datum().x,
        lineNumber = 1,
        tspan = textNode.text(null).append("tspan").attr("dx", "0em").attr("dy", "0em").attr("x", x),
        firstTspan = textNode.select("tspan");
      while (word = words.pop()) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
          line.pop();
          tspan.text(line.join(" "));
          line = [word];
          tspan = textNode.append("tspan")
            .attr("x", x)
            .attr("dx", "0em")
            .attr("dy", lineHeight + "em")
            .text(word);
          lineNumber++;
        }
      }
      firstTspan.attr("dy", (-0.3 * lineNumber) + "em")
    });
  }

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
