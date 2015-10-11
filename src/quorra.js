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
        // sizing
        id: id,
        width: "auto",
        height: "auto",
        margin: {"top": 20, "bottom": 40, "left": 40, "right": 20},
        
        // data rendering
        x: function(d, i) { return d.x; },
        y: function(d, i) { return d.y; },
        group: function(d, i){ return (typeof d.group === 'undefined') ? 0 : d.group; },
        label: function(d, i){ return (typeof d.label === 'undefined') ? i : d.label; },
        transform: function(d){ return d; },
        color: "auto",
        xrange: "auto",
        yrange: "auto",

        // triggers
        groupclick: function(d, i){},
        labelclick: function(d, i){},
        
        // plot styling
        grid: false,
        xticks: "auto",
        yticks: "auto",
        xformat: "auto",
        yformat: "auto",
        xorient: "bottom",
        yorient: "left",
        xlabel: "",
        ylabel: "",
        yposition: "outside",
        xposition: "outside",
        labelposition: "middle",
        labelpadding: {x: 0, y: 0},
        
        // legend
        legend: true,
        lmargin: {"top": 0, "bottom": 0, "left": 0, "right": 0},
        lposition: "inside",
        lshape: "square",
        toggle: true,
        
        // tooltip/annotation
        annotation: false,
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
            // maintain non-overridden object arguments
            if (typeof value === 'object' && i != 'tooltip'){            
                if (typeof attributes[i] === 'object'){
                    attributes[i] = _.extend(attributes[i], value);
                }else{
                    attributes[i] = value;
                }
            }else{
                attributes[i] = value;
            }
            return constructor;
        }    
    });
}

legendConstructor = function(svg, attr, innerWidth, innerHeight, color){
    /**
    quorra.legendConstructor()

    Construct legend component of plot, using plot attributes.

    @author <bprinty@gmail.com>
    */

    if (!attr.legend){ return undefined; }

    var leg = svg.selectAll(".legend")
        .data(color.domain())
        .enter().append("g")
        .attr("class", "legend")
        .attr("id", attr.id + "-legend")
        .attr("transform", function(d, i) { return "translate(0," + (attr.lmargin.top + i * 20) + ")"; });

    var selector;
    if (attr.lshape === "square"){
        selector = leg.append("rect")
            .attr("class", "selector")
            .attr("x", innerWidth - 18 - attr.lmargin.right + attr.lmargin.left)
            .attr("width", 18)
            .attr("height", 18)
            .style("fill", color);        
    }else if (attr.lshape === "circle"){
        selector = leg.append("circle")
            .attr("class", "selector")
            .attr("cx", innerWidth - 10 - attr.lmargin.right + attr.lmargin.left)
            .attr("cy", 8)
            .attr("r", 9)
            .style("fill", color);
    }

    if (attr.toggle){
        selector.on("mouseover", function(d, i){
            d3.select(this).style('opacity', 0.75);
        }).on("mouseout", function(d, i){
            d3.select(this).style('opacity', 1);
        }).on("click", function(d, i){
            if (d3.select(this).style('fill-opacity') == 0){
                d3.select(this).style('fill-opacity', 1);
                svg.selectAll(".g_" + d).style('visibility', 'visible');
            }else{
                d3.select(this).style('fill-opacity', 0);
                svg.selectAll(".g_" + d).style('visibility', 'hidden');
            }
        });
    }

    leg.append("text")
        .attr("x", function(){
            if (attr.lposition === "inside"){
                return innerWidth - 24 - attr.lmargin.right + attr.lmargin.left;
            }else if (attr.lposition === "outside"){
                return innerWidth + 2 - attr.lmargin.right + attr.lmargin.left;
            }        
        })
        .attr("y", 9)
        .attr("dy", ".35em")
        .style("text-anchor", function(){
            if (attr.lposition === "inside"){
                return "end";
            }else if (attr.lposition === "outside"){
                return "beginning";
            }
        })
        .text(function(d) { return d; });

    return leg;
}

parameterizeInnerDimensions = function(selection, attr){
    /**
    quorra.parameterizeInnerDimensions()

    Parameterize dimensions for plot based on margins.

    @author <bprinty@gmail.com>
    */
    var width = (attr.width == "auto") ? parseInt(selection.style("width")) : attr.width;
    var height = (attr.height == "auto") ? parseInt(selection.style("height")) : attr.height;
    
    var iw = width - attr.margin.left - attr.margin.right - attr.labelpadding.y;
    var ih = height - attr.margin.top - attr.margin.bottom - attr.labelpadding.x;

    return {
        innerWidth: iw,
        innerHeight: ih
    };
}


parameterizeColorPallete = function(data, attr){
    /**
    quorra.parameterizeColorPallete()

    Parameterize color pallete based on grouping.

    @author <bprinty@gmail.com>
    */
    var pallette = (attr.color === "auto") ? d3.scale.category10() : d3.scale.ordinal().range(attr.color);
    var domain = _.unique(_.map(data, attr.group)).sort();
    return pallette.domain(domain);
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
        if (attr.xrange === "auto"){
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
        }else{
            xScale.domain(attr.xrange).nice();
        }
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
        if (attr.yrange === "auto"){
            if (attr.layout === 'stacked'){
                // for some reason, underscore's map function won't 
                // work for accessing the d.y0 property -- so we have
                // to do it another way
                var ux = _.unique(_.map(data, attr.x));
                var marr = _.map(ux, function(d){
                    var nd =_.filter(
                            data,
                            function(g){ return attr.x(g) == d; }
                        );
                    var tmap = _.map(nd, function(g){ return attr.y(g); });
                    return _.reduce(tmap, function(a, b){ return a + b; }, 0);
                });
                var max = _.max(marr);
            }else{
                var max = _.max(_.map(data, attr.y));
            }
            yScale.domain([
                _.min(_.map(data, attr.y)),
                max
            ]).nice();
        }else{
            yScale.domain(attr.yrange).nice();
        }
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

    // x axis
    svg.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + innerHeight + ")")
        .call(xAxis)
    .append("text")
        .attr("class", "label")
        .attr("x", function(x){
            if (attr.labelposition == "end"){
                return innerWidth;
            }else if (attr.labelposition == "middle"){
                return innerWidth / 2;
            }else if (attr.labelposition == "beginning"){
                return 0;
            }
        })
        .attr("y", function(){
            if (attr.xposition == "inside"){
                return -6 + attr.labelpadding.x;
            }else if(attr.xposition === "outside"){
                return 35 + attr.labelpadding.x;
            }
        })
        .style("text-anchor", attr.labelposition)
        .text(attr.xlabel);

    // y axis
    svg.append("g")
        .attr("class", "y axis")
        .call(yAxis)
    .append("text")
        .attr("class", "label")
        .attr("transform", "rotate(-90)")
        .attr("x", function(x){
            if (attr.labelposition == "end"){
                return 0;
            }else if (attr.labelposition == "middle"){
                return -innerHeight / 2;
            }else if (attr.labelposition == "beginning"){
                return -innerHeight;
            }
        }).attr("y", function(){
            if (attr.yposition == "inside"){
                return 6 + attr.labelpadding.y;
            }else if(attr.yposition === "outside"){
                return -40 + attr.labelpadding.y;
            }
        })
        .attr("dy", ".71em")
        .style("text-anchor", attr.labelposition).text(attr.ylabel);

    // clip plot area
    svg.append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", innerWidth)
        .attr("height", innerHeight);

    return;
}


initializeCanvas = function(selection, attr){
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

    svg = svg.attr("class", "quorra-" + attr.id)
        .attr("width", attr.width)
        .attr("height", attr.height)
        .append("g")
        .attr("transform", "translate(" + attr.margin.left + "," + attr.margin.top + ")");

    return svg;
}


annotationConstructor = function(svg, attr, xScale, yScale){
    /**
    quorra.initializeCanvas()

    Initialze canvas for quorra plot and return svg selection.

    @author <bprinty@gmail.com>
    */
    if (attr.annotation == false){ return false; }

    if (!Array.isArray(attr.annotation)){
        attr.annotation = [attr.annotation]
    }
    _.map(attr.annotation, function(d){
        d = _.extend({
            type: 'circle',
            text: '',
            value: '',
            size: 15,
            'font-size': 13,
            'font-position': {x: 0, y: 20},
            x: 0,
            y: 0,
            style: {}
        }, d);
        quorra[d.type](svg, d.size, xScale(d.x), yScale(d.y), d.style);
        if (d.text != ''){
            quorra.text(svg, d['font-size'], xScale(d.x) + d['font-position'].x, xScale(d.y) - d['font-position'].y, d.text);
        }
        return;
    });
    return ;
}
