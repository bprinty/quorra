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

        // set up scaling for axes
        // TODO: allow users to pass in arbitrary scaling function
        //       i.e. d3.scale.log()

        // x scale formatting
        _this.xmapper = function(d) { return d; };
        if (typeof _this.data[0].x === 'string') {
            _this.xord = d3.scale.ordinal()
                .domain(_this.domain)
                .range(_.range(_this.domain.length));
            _this.xordrev = d3.scale.ordinal()
                .domain(_this.xord.range())
                .range(_this.xord.domain());
            _this.xmapper = function(d) { return _this.xord(d); };
            if (typeof domain[0] === 'string') {
                domain = _.map(domain, _this.xmapper);
                domain[0] = domain[0] - 0.5;
                domain[domain.length - 1] = domain[domain.length - 1] + 0.5;
            }
        }
        _this.xscale = d3.scale.linear()
            .domain([domain[0], domain[domain.length-1]])
            .range([0, _this.innerwidth]);

        // x axis formatting
        _this.xaxis = d3.svg.axis().scale(_this.xscale).orient(_this.attr.xorient);
        if (_this.attr.xticks !== "auto") {
            _this.xaxis = _this.xaxis.ticks(_this.attr.xticks);
        } else if (_this.type === 'histogram') {
            _this.xaxis = _this.xaxis.ticks(_this.attr.bins);
        }
        if (_this.attr.xformat !== "auto") {
            _this.xaxis = _this.xaxis.tickFormat(_this.attr.xformat);
        }
        if (typeof _this.data[0].x === 'string') {
            if (typeof domain[0] == 'string') {
                domain = _.map(domain, _this.xord);
            }
            _this.xaxis = _this.xaxis.tickValues(_.range(
                Math.ceil(domain[0]),
                Math.floor(domain[domain.length - 1]) + 1
            )).tickFormat(_this.xordrev);
        }

        // y scale formatting
        _this.ymapper = function(d) { return d; };
        if (typeof _this.data[0].y === 'string') {
            _this.yord = d3.scale.ordinal()
                .domain(_this.range)
                .range(_.range(_this.range.length));
            _this.yordrev = d3.scale.ordinal()
                .domain(_this.yord.range())
                .range(_this.yord.domain());
            _this.ymapper = function(d) { return _this.yord(d); };
            if (typeof range[0] === 'string') {
                range = _.map(range, _this.ymapper);
                range[0] = range[0] - 0.5;
                range[range.length - 1] = range[range.length - 1] + 0.5;
            }
        }
        _this.yscale = d3.scale.linear()
            .domain([range[0], range[range.length-1]])
            .range([ _this.innerheight, 0]);

        // y axis formatting
        _this.yaxis = d3.svg.axis().scale(_this.yscale).orient(_this.attr.yorient);
        if (_this.attr.yticks !== "auto") {
            _this.yaxis = _this.yaxis.ticks(_this.attr.yticks);
        }
        if (_this.attr.yformat !== "auto") {
            _this.yaxis = _this.yaxis.tickFormat(_this.attr.yformat);
        }
        if (typeof _this.data[0].y === 'string') {
            if (typeof range[0] == 'string') {
                range = _.map(range, _this.yord);
            }
            _this.yaxis = _this.yaxis.tickValues(_.range(
                Math.ceil(range[0]),
                Math.floor(range[range.length - 1]) + 1
            )).tickFormat(_this.yordrev);
        }

        // configure grid (if specified)
        if (_this.attr.grid) {
            _this.xaxis = _this.xaxis.tickSize(-_this.innerheight, 0, 0);
            _this.yaxis = _this.yaxis.tickSize(-_this.innerwidth, 0, 0);
        }

        // x axis
        if (_this.attr.xaxis !== "hidden" && _this.attr.xaxis !== false) {
            _this.plotregion
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
            _this.plotregion
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
        quorra.log('drawing plot data');
    }

    return this.go;
}

Multiline.prototype = Object.create(QuorraPlot.prototype);
Multiline.prototype.constructor = Multiline;
quorra.multiline = function(attributes) {
    return new Multiline(attributes);
};
