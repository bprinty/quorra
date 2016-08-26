import { QuorraPlot } from '../quorra.js';
import { utils } from '../utils.js';

export class Bar extends QuorraPlot {
  /**
  quorra.bar()

  Bar plot. Code for generating this type of plot was inspired from:
  http://bl.ocks.org/mbostock/3943967

  @author <bprinty@gmail.com>
  */

  constructor() {
    // call super with plot-specific attributes
    if (!window.hasOwnProperty('attributes')) window.attributes {};
    super(utils.extend({
      class: 'quorra-bar',
      layout: 'stacked'
    }, window.attributes));
    this.type = 'bar';
  }

  render() {
    let layers = [];
    let uGroups = this.pallette.domain();

    // get the data we're working with
    this.plotdata = this.hotdata();

    // sort domain values lexographically
    if (typeof this.plotdata[0].x === 'string') {
      this.plotdata = this.plotdata.sort((a, b) => (a.x > b.x));
    }

    for (let group in uGroups) {
      let filtered = _.chain(this.plotdata)
                      .filter(d => (d.group === uGroups[group]))
                      .map(d => {d.layer = group; return d;})
                      .filter(d => (d.group === uGroups[group]))
                      .value();
      layers.push(filtered);
    }
  }
}
