function Multiline(attributes) {
    /**
    quorra.multiline()

    Line plot with sections of different relative scaling.

    @author <bprinty@gmail.com>
    */
    var _this = this;
    if (typeof attributes == 'undefined') attributes = {};

    // plot-specific attributes
    QuorraPlot.call(this, extend({
        class: "quorra-multiline",
        points: 0,
        size: 3,
        layout: "line",
        interpolate: "linear"
    }, attributes));
    this.type = "multiline";

    // overwrite axes method
    this.axes = function() {
        quorra.log('redrawing axes');

        // parameterize axes scaling
        var domain = _this.attr.xrange === "auto" ? _this.domain : _this.attr.xrange;
        var range = _this.attr.yrange === "auto" ? _this.range : _this.attr.yrange;
        if (_this.type === 'histogram') {
            domain[1] = domain[1] + (domain[1] - domain[0])/(_this.attr.bins-1);
        }

        // set up scaling for axes
        // TODO: allow users to pass in arbitrary scaling function
        //       i.e. d3.scale.log()
        if (typeof _this.data[0].x === 'string') {
            _this.xscale = d3.scale.ordinal()
                .domain(domain)
                .range([0, _this.innerwidth])
                .rangePoints([0, _this.innerwidth], 1);
        } else {
            _this.xscale = d3.scale.linear()
                .domain(domain)
                .range([0, _this.innerwidth]);
        }
        if (typeof _this.data[0].y === 'string') {
            _this.yscale = d3.scale.ordinal()
                .domain(range)
                .range([0, _this.innerheight])
                .rangePoints([_this.innerheight, 0], 1);
        } else {
            _this.yscale = d3.scale.linear()
                .domain(range)
                .range([ _this.innerheight, 0]);
        }

        // tick formatting
        _this.xaxis = d3.svg.axis().scale(_this.xscale).orient(_this.attr.xorient);
        if (_this.attr.xticks !== "auto") {
            _this.xaxis = _this.xaxis.ticks(_this.attr.xticks);
        } else if (_this.type === 'histogram') {
            _this.xaxis = _this.xaxis.ticks(_this.attr.bins);
        }
        _this.yaxis = d3.svg.axis().scale(_this.yscale).orient(_this.attr.yorient);
        if (_this.attr.yticks !== "auto") {
            _this.yaxis = _this.yaxis.ticks(_this.attr.yticks);
        }

        // number formatting
        if (_this.attr.xformat !== "auto") {
            _this.xaxis = _this.xaxis.tickFormat(_this.attr.xformat);
        }
        if (_this.attr.yformat !== "auto") {
            _this.yaxis = _this.yaxis.tickFormat(_this.attr.yformat);
        }

        // configure grid (if specified)
        if (_this.attr.grid) {
            _this.xaxis = _this.xaxis.tickSize(-_this.innerheight, 0, 0);
            _this.yaxis = _this.yaxis.tickSize(-_this.innerwidth, 0, 0);
        }

        // x axis
        if (_this.attr.xaxis !== "hidden" && _this.attr.xaxis !== false) {
            _this.plotarea
                .append("g")
                .attr("class", "x axis")
                .attr("transform", "translate(0," + _this.innerheight + ")")
                .call(_this.xaxis)
                .append("text")
                    .attr("class", "label")
                    .attr("x", function(x){
                        if (_this.attr.labelposition === "end"){
                            return _this.innerwidth;
                        }else if (_this.attr.labelposition === "middle"){
                            return _this.innerwidth / 2;
                        }else if (_this.attr.labelposition === "beginning"){
                            return 0;
                        }
                    })
                    .attr("y", function(){
                        if (_this.attr.xaxis === "inside"){
                            return -6 + _this.attr.labelpadding.x;
                        }else if(_this.attr.xaxis === "outside"){
                            return 35 + _this.attr.labelpadding.x;
                        }
                    })
                    .style("text-anchor", _this.attr.labelposition)
                    .text(_this.attr.xlabel);
        }

        // y axis
        if (_this.attr.yaxis !== "hidden" && _this.attr.yaxis !== false) {
            _this.plotarea
                .append("g")
                .attr("class", "y axis")
                .call(_this.yaxis)
                .append("text")
                    .attr("class", "label")
                    .attr("transform", "rotate(-90)")
                    .attr("x", function(x){
                        if (_this.attr.labelposition === "end"){
                            return 0;
                        }else if (_this.attr.labelposition === "middle"){
                            return -_this.innerheight / 2;
                        }else if (_this.attr.labelposition === "beginning"){
                            return -_this.innerheight;
                        }
                    }).attr("y", function(){
                        if (_this.attr.yaxis === "inside"){
                            return 6 + _this.attr.labelpadding.y;
                        }else if(_this.attr.yaxis === "outside"){
                            return -40 + _this.attr.labelpadding.y;
                        }
                    })
                    .attr("dy", ".71em")
                    .style("text-anchor", _this.attr.labelposition)
                    .text(_this.attr.ylabel);
        }
    }

    // overwrite render method
    this.plot = function() {

    }

    return this.go;
}

Multiline.prototype = Object.create(QuorraPlot.prototype);
Multiline.prototype.constructor = Multiline;
quorra.multiline = function(attributes) {
    return new Multiline(attributes);
};
