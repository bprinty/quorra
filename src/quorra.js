function quorra() {
    /**
    quorra()

    Base class for all visualization components.

    @author <bprinty@gmail.com>
    */
}


attributeConstructor = function(id){
    /**
    attributeConstructor()

    Return dictionary with common quorra attributes. This
    is for cutting down code duplication.

    @author <bprinty@gmail.com>
    */

    id = typeof id !== 'undefined' ?  id : 'qplot';
    return {
        id: id,
        width: "auto",
        height: "auto",
        margin: {"top": 20, "bottom": 20, "left": 40, "right": 20},
        color: d3.scale.category10(),
        x: function(d, i) { return d.x; },
        y: function(d, i) { return d.y; },
        group: function(d, i){ return (typeof d.group === 'undefined') ? 0 : d.group; },
        label: function(d, i){ return (typeof d.label === 'undefined') ? i : d.label; },
        transform: function(d){ return d; },
        grid: false,
        xlabel: "",
        ylabel: "",
        xformat: "auto",
        yformat: "auto",
        xorient: "bottom",
        yorient: "left",
        legend: true,
        lshape: "square",
        xticks: "auto",
        yticks: "auto",
        tooltip: d3.select("body").append("div")
            .attr("id", id + "-tooltip")
            .attr("class", "tooltip")
            .style("position", "absolute")
            .style("opacity", 0),
    };
}


bindConstructorAttributes = function(constructor, attributes){
    /**
    quorra.bindConstructorAttributes()

    Bind attributes to constructor function in quorra to 
    enable attribute getting/setting.

    @author <bprinty@gmail.com>
    */

    Object.keys(attributes).forEach(function(i){
        constructor[i] = function(value) {
            if (!arguments.length) return attributes[i];

            // binding a tooltip requires removal of the previous
            if (i === 'tooltip'){
                attributes[i].remove();
            }
            attributes[i] = value;
            return constructor;
        }        
    });
}

legendConstructor = function(svg, attr, innerwidth, innerheight){
    /**
    quorra.legendConstructor()

    Construct legend component of plot, using plot attributes.

    @author <bprinty@gmail.com>
    */

    if (!attr.legend){ return undefined; }

    var leg = svg.selectAll(".legend")
        .data(attr.color.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; });

    leg.append("rect")
        .attr("x", innerwidth - 18)
        .attr("width", 18)
        .attr("height", 18)
        .style("fill", attr.color);

    leg.append("text")
        .attr("x", innerwidth - 24)
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", "end")
        .text(function(d) { return d; });

    return leg;
}


parameterizeAxes = function(selection, data, attr, innerWidth, innerHeight){
    /**
    quorra.parameterizeAxes()

    Parameterize axes for plot based on data and attributes.

    @author <bprinty@gmail.com>
    */

    // x scaling
    var xScale, xGroups;
    if (typeof data[0].x === 'string') {
        xGroups = _.unique(_.map(selection.data()[0], attr.x));
        xScale = d3.scale.ordinal().range([0, innerWidth]);
        xScale.domain(xGroups).rangePoints(xScale.range(), 1);
    }else{
        xScale = d3.scale.linear().range([0, innerWidth]);
        // manually set the domain here because it needs to 
        // be aware of the data object (histogram plots)
        // and x axis tweaks for histogram objects
        var xmax;
        if (typeof attr.bins === 'undefined') {
            xmax = _.max(_.map(data, attr.x));
        } else {
            xmax = _.max(xScale.ticks(attr.bins));
        }
        xScale.domain([
            _.min(_.map(data, attr.x)),
            xmax
        ]).nice();
    }

    // y scaling
    var yScale, yGroups;
    if (typeof data[0].y === 'string') {
        yGroups = _.unique(_.map(data, attr.y));
        yScale = d3.scale.ordinal().range([innerHeight, 0]);
        yScale.domain(yGroups).rangePoints(yScale.range(), 1);
    }else{
        yScale = d3.scale.linear().range([innerHeight, 0]);
        // manually set the domain here because it needs to 
        // be aware of the data object (histogram plots)
        yScale.domain(d3.extent(data, attr.y)).nice();
    }

    // tick formatting
    var xAxis = d3.svg.axis().scale(xScale).orient(attr.xorient);
    if (attr.xticks != "auto") {
        xAxis = xAxis.ticks(attr.xticks);
    }
    var yAxis = d3.svg.axis().scale(yScale).orient(attr.yorient);
    if (attr.yticks != "auto") {
        yAxis = yAxis.ticks(attr.yticks);
    }

    // number formatting
    if (attr.xformat != "auto"){
        xAxis = xAxis.tickFormat(attr.xformat);
    }
    if (attr.yformat != "auto"){
        yAxis = yAxis.tickFormat(attr.yformat);
    }

    return {
        xGroups: xGroups,
        yGroups: yGroups,
        xScale: xScale,
        yScale: yScale,
        xAxis: xAxis,
        yAxis: yAxis
    }
}


drawAxes = function(svg, attr, xAxis, yAxis, innerWidth, innerHeight){
    /**
    quorra.drawAxes()

    Construct legend component of plot, using plot attributes.

    @author <bprinty@gmail.com>
    */
    if (attr.grid){
        xAxis = xAxis.tickSize(-innerHeight, 0, 0);
        yAxis = yAxis.tickSize(-innerWidth, 0, 0);
    }

    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + innerHeight + ")")
        .call(xAxis)
    .append("text")
        .attr("class", "label")
        .attr("x", innerWidth)
        .attr("y", -6)
        .style("text-anchor", "end")
        .text(attr.xlabel);

    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
    .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("y", 6)
        .attr("dy", ".71em")
        .style("text-anchor", "end")
        .text(attr.ylabel);

    return;
}


initializeCanvas = function(selection, attr, innerWidth, innerHeight){
    /**
    quorra.initializeCanvas()

    Initialze canvas for quorra plot and return svg selection.

    @author <bprinty@gmail.com>
    */
    var svg;
    if (selection.select("svg")[0][0] == null){
        svg = selection.append("svg");
    } else {
        svg = selection.select("svg");
    }

    svg = svg.attr("class", "quorra-bar")
        .attr("width", innerWidth + attr.margin.left + attr.margin.right)
        .attr("height", innerHeight + attr.margin.top + attr.margin.bottom)
        .append("g")
        .attr("transform", "translate(" + attr.margin.left + "," + attr.margin.top + ")");

    return svg;
}
