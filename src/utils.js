/**

Common utilities used across plot generators.

@author <bprinty@gmail.com>

*/


// set default seed for random number generation
var seed = Math.round(Math.random()*100000);

quorra.seed = function(value){
    /**
    quorra.seed()

    Set seed for reproducable random number generation. 

    @author <bprinty@gmail.com>
    */

    if (!arguments.length) return seed;
    seed = value;
};


quorra.random = function() {
    /**
    quorra.random()

    Random number generation using internal seed. 

    @author <bprinty@gmail.com>
    */

    if (typeof seed === 'undefined') seed = 42;
    var x = Math.sin(seed++) * 10000;
    return x - Math.floor(x);
};


quorra.uuid = function() {
    /**
    quorra.uuid()

    Generate random uuid with seed. 

    @author <bprinty@gmail.com>
    */

    function uk() {
        return Math.floor((1 + quorra.random()) * 0x10000)
            .toString(16).substring(1);
    }
    return 'u' + [
        uk() + uk(),
        uk(), uk(), uk(),
        uk() + uk() + uk()
    ].join('-');
};


// underscore additions
_.center = function(x, bounds){
    return _.min([_.max([x, bounds[0]]), bounds[1]]);
}

_.uniquesort = function(x, func) {
    if (typeof func === 'undefined') {
        func = function(x){ return x; };
    }
    return _.unique(_.map(x, func)).sort();
}


// common generator object utilities
parameterize = function(attributes, generator) {
    /**
    parameterize()

    Add getters and setters to generator functions for
    specified attributes
    */

    // binding attributes to constructor function
    Object.keys(attributes).forEach(function(i) {
        generator[i] = function(value) {
            if (!arguments.length) return attributes[i];

            // binding a tooltip requires removal of the previous
            if (i === 'tooltip') {
                attributes[i].remove();
            }
            // maintain non-overridden object arguments
            if (typeof value === 'object' && i != 'tooltip') {
                if (typeof attributes[i] === 'object') {
                    if (Array.isArray(attributes[i]) && ! Array.isArray(value)) {
                        value = [value];
                    }
                    attributes[i] = _.extend(attributes[i], value);
                } else {
                    attributes[i] = value;
                }
            } else {
                attributes[i] = value;
            }
            return generator;
        };
    });
}

extend = function(stock, custom) {
    /**
    extend()

    Recursively extend attributes with specified parameters.
    */
    _.map(Object.keys(custom), function(d) {
        if (typeof stock[d] === 'undefined') {
            stock[d] = custom[d];
        }
    });

    _.map(Object.keys(stock), function(d) {
        if (typeof custom[d] != 'undefined') {
            if (typeof stock[d] == "object" && ! Array.isArray(stock[d]) && stock[d] != null) {
                stock[d] = extend(stock[d], custom[d]);
            } else if (Array.isArray(stock[d]) && !Array.isArray(custom[d])) { 
                stock[d] = [custom[d]];
            } else {
                stock[d] = custom[d];
            }
        }
    });
    return stock;
}

