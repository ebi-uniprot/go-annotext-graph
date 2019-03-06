import { LitElement, html } from "lit-element";
import * as d3Select from "d3-selection";
import * as force from "d3-force";
import * as ellipseForce from "d3-ellipse-force";
import * as d3Drag from "d3-drag";
import * as chromatic from "d3-scale-chromatic";

const url = "https://www.ebi.ac.uk/QuickGO/services/ontology/ae/relations";

type NodeDatum = {
  id: string;
  rx: number;
  ry: number;
  fx: number;
  fy: number;
  x?: number;
  y?: number;
};

type EdgeDatum = {
  source: NodeDatum;
  target: NodeDatum;
};

class GoAnnotextGraph extends LitElement {
  width = 1500;
  height = 900;
  rx = 38;
  ry = 38;
  data: { nodes: NodeDatum[]; edges: EdgeDatum[] } | undefined = undefined;
  colorScale = chromatic.schemeAccent;
  simulation:
      | force.Simulation<NodeDatum | {}, EdgeDatum | undefined>
      | undefined = undefined;
  link: any;
  node: any;
  text: any;
  svg: any;
  tooltip: any;

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
      .attr("x1", (d: EdgeDatum) => d.source.x)
      .attr("y1", (d: EdgeDatum) => d.source.y)
      .attr("x2", (d: EdgeDatum) => d.target.x)
      .attr("y2", (d: EdgeDatum) => d.target.y)
      .attr("stroke", this.colorScale[0])
      .attr("stroke-width", 1);

    this.node.selectAll("ellipse").attr("cx", (d: any) => d.x).attr("cy", (d: any) => d.y);
    this.text.attr("x", (d: any) => d.x).attr("y", (d: any) => d.y);

/* We might need this if still problems with fitting inside the svg box
    const radiusX = this.rx;
    const radiusY = this.ry;
    this.node
      .attr("cx", d => Math.max(radiusX, Math.min(this.width - radiusX, d.x)))
      .attr("cy", d => Math.max(radiusY, Math.min(this.height - radiusY, d.y)));
    this.text
      .attr("x", d => Math.max(radiusX, Math.min(this.width - radiusX, d.x)))
      .attr("y", d => Math.max(radiusY, Math.min(this.height - radiusY, d.y)));
*/

    this.wrap();
  };

  initForceDisplay = () => {
    if (this.shadowRoot === null || typeof this.data === "undefined") {
      return;
    }

    const dataWithSizes = this.data.nodes.map(d => {
      return { ...d, rx: this.rx, ry: this.ry };
    });

    this.simulation = force
      .forceSimulation()
      .force("link", force.forceLink().id((d: any) => d.id))
      .force("charge", ellipseForce.ellipseForce(6, 0.5, 5.8))
      .force("center", force.forceCenter(this.width / 2, this.height / 2));

    this.svg = d3Select.select(
      this.shadowRoot.getElementById("annotext-graph")
    );

    this.tooltip = d3Select.select(
        this.shadowRoot.getElementById("gag-tooltip")
    );

    this.svg.append("svg:defs").selectAll("marker")
      .data(["end"])      // Different link/path types can be defined here
      .enter().append("svg:marker")    // This section adds in the arrows
      .attr("id", String)
      .attr("viewBox", "0 -10 15 15")
      .attr("refX", 70)
      .attr("refY", -1.5)
      .attr("markerWidth", 10)
      .attr("markerHeight", 10)
      .attr("orient", "auto")
      .append("svg:path")
      .attr("d", "M0,-6L11,0L0,6");

    // link lines
    this.link = this.svg
      .append("g")
      .selectAll("line")
      .data(this.data.edges)
      .enter()
      .append("line")
      .attr("marker-end", "url(#end)");

    // node groups
    this.node = this.svg
      .append("g")
      .selectAll(".nodeGroup")
      .data(dataWithSizes)
      .enter()
      .append("g")
      .attr("class", "nodeGroup")
      .on("click", (d: any) => {
        this.showTooltip(d, d3Select.event.pageX, d3Select.event.pageY);
      })
      .call(
        d3Drag
          .drag()
          .on("start", this.dragstarted)
          .on("drag", this.dragged)
          .on("end", this.dragended)
      );

    this.node
      .append("ellipse")
      .attr("rx", (d: any) => d.rx)
      .attr("ry", (d: any) => d.ry)
      .attr("stroke", this.colorScale[4])
      .attr("fill", this.colorScale[1])
      .attr("id", (d: any) => "node_" + d.id);

    // node text
    this.text = this.node
      .append("text")
      .attr("dy", 2)
      .attr("text-anchor", "middle")
      .text((d: any)  => d.id.replace(/_/gi, " ").trim())
      .attr("id", (d: any) => d.id)
      .attr("fill", "black")
      ;

    this.simulation.nodes(dataWithSizes).on("tick", this.ticked);
    this.simulation.force("link").links(this.data.edges);
  };

  dragstarted = (d: any) => {
    if (typeof this.simulation === "undefined") {
      return;
    }
    if (!d3Select.event.active) this.simulation.alphaTarget(0.3).restart();
    d.fx = d.x;
    d.fy = d.y;
  };

  dragged = (d: any) => {
    d.fx = d3Select.event.x;
    d.fy = d3Select.event.y;
  };

  dragended = (d: any) => {
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
        words = elem.id
            .replace(/_/gi, " ")
            .trim()
            .split(/\s+/)
            .reverse(),
        word,
        line = [],
        lineHeight = 1.1, //em
        x = textNode.datum().x,
        lineNumber = 1,
        tspan = textNode.text(null).append("tspan"),
        firstTspan = textNode.select("tspan");
      while ((word = words.pop())) {
        line.push(word);
        tspan.text(line.join(" "));
        if (tspan.node().getComputedTextLength() > width) {
            line.pop();
            tspan.text(line.join(" "));
            line = [word];
            tspan = textNode
                .append("tspan")
                .attr("x", x)
                .attr("dx", "0em")
                .attr("dy", lineHeight + "em")
                .text(word);
            lineNumber++;
        }
      }
      firstTspan.attr("dy", -0.3 * lineNumber + "em");
    });
}

  showTooltip(datum: any, pageX: number, pageY: number) {
    this.tooltip.attr("class", "gag-closed-tooltip").html("");
    this.svg.selectAll("ellipse").attr("stroke-width", 1);

    const aNode = this.svg.select("#node_" + datum.id);
    aNode.attr("stroke-width", 5);

    this.tooltip
      .attr("class", "gag-opened-tooltip")
      .style("left", pageX + "px")
      .style("top", pageY - 28 + "px");

    this.tooltip.append("span")
      .attr("class", "gag-tooltip-close")
      .text("X")
      .on("click", () => {
        aNode.attr("stroke-width", 1);
        this.tooltip.attr("class", "gag-closed-tooltip").html("");
      });

    let subsets = "";
    datum.subsets.forEach((set: any) => {
      subsets += "<br>" + set;
    });

    this.tooltip.append("span")
      .html(() =>
        datum.id + "<hr>"
          + "<bold>GOC documentation:</bold> <a href='https://github.com/geneontology/annotation_extensions/blob/master/doc/" + datum.id + ".md' target='_blank'>" + datum.id + "</a> "
          + "<br>" + "<bold>GO Annotation Domain: </bold>" + datum.domain
          + "<br>" + "<bold>GO Annotation Range: </bold>" + datum.range
          + "<br>" + "<bold>Usage: </bold>" + datum.usage
          + "<br>" + "<bold>Subsets: </bold>" + subsets
      );
  }

  render() {
    return html`
      <style>
        :host {
          font-family: Helvetica, Arial, sans-serif;
          font-size: 10px;
        }
        .gag-opened-tooltip {
          visibility: visible;
          float: left;
          padding: 4px 10px 4px 4px;
          margin: 2px;
          width: 300px;
          border: 1px solid black;
          position: absolute;
          background-color: whitesmoke;
        }
        .gag-closed-tooltip {
          visibility: hidden;
          position: absolute;
        }
        .gag-tooltip-close {
          color: #fff;
          background-color: #333333;
          position: absolute;
          top: -10px;
          right: -10px;
          cursor: pointer;
          border-radius: 20px;
          width: 20px;
          height: 20px;
          font-size: 14px !important;
          text-align: center;
          border: 1px solid #fff;
        }
      </style>
      <div id="gag-tooltip" class="gag-closed-tooltip"></div>
      <svg
        id="annotext-graph"
        width="${this.width}"
        height="${this.height}"
      ></svg>
    `;
  }
}

customElements.define("go-annotext-graph", GoAnnotextGraph);
