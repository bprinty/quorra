quorra.density = function() {
    /**
    quorra.density()

    Density plot. Code for generating this type of plot was inspired from:
    http://bl.ocks.org/mbostock/3883245

    @author <bprinty@gmail.com>
    */

    // attributes
    var resolution = 10;
    var tooltip = d3.select("body").append("div")
        .attr("id", "density-tooltip")
        .attr("class", "tooltip")
        .style("position", "absolute")
        .style("opacity", 0);

    // generator
    var go = quorra.line()
        .tooltip(tooltip)
        .transform(function(data){
        
        // generate kde scaling function
        var format = d3.format(".04f");
        var xScale = d3.scale.linear().range([0, go.w]);
        var kde = kdeEstimator(epanechnikovKernel(9), xScale.ticks(go.resolution()));

        // rearranging data
        var grps = _.unique(_.map(data, function(d){ return d.group; }));
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
    });

    // getters/setters
    go.resolution = function(value) {
        if (!arguments.length) return resolution;
        resolution = value;
        return go;
    };

    return go;
};