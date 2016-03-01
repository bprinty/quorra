function Density(attributes) {
    /**
    quorra.density()

    Density plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */
    var _this = this;

    // parent class initialization
    Line.call(this, _.extend({
        resolution: 10
    }, attributes));

    // data transformation
    _this.attr.transform = function(data) {

        // generate kde scaling function
        var format = d3.format(".04f");
        var kde = kdeEstimator(epanechnikovKernel(9), d3.scale.linear().ticks(_this.attr.resolution));

        // rearranging data
        var grps = _.uniquesort(data, _this.attr.group);
        var newdata = [];
        for (var grp in grps){
            var subdat = _.filter(data, function(d){ return d.group == grps[grp]; });
            var newgrp = kde(_.map(subdat, function(d){ return d.x }));
            newgrp = _.map(newgrp, function(d){
                return {
                    x: d.x,
                    y: d.y,
                    group: grps[grp],
                    label: format(d.y)
                };
            });
            newdata = newdata.concat(newgrp);
        }

        return newdata;
    }

    return this.go;
}

Density.prototype = Object.create(Line.prototype);
Density.prototype.constructor = Density;
quorra.density = Density;
