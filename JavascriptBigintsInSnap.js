window.toNumber = function(val){
    //converts values to numbers(needed to replace the +(...) syntax for BigInt support)
    if(typeof val === 'bigint') return val;
    return +val;
}
window.isNumber = function(val){
    return val === toNumber(val);
}
window.snapEquals = function(a, b) {
    // nil
    if (isNil(a) || isNil(b)) {
        return a === b;
    }

    // lists, functions and blocks
    if (a.equalTo || b.equalTo) {
        if (a.constructor.name === b.constructor.name) {
            return a.equalTo(b);
        }
        return false;
    }

    // colors (points, rectangles)
    if (a.eq || b.eq) {
        if (a.constructor.name === b.constructor.name) {
            return a.eq(b, true); // observe alpha
        }
        return false;
    }

    // selectors (translatable text)
    if (a instanceof Array) {
        return snapEquals(a[0], b);
    }
    if (b instanceof Array) {
        return snapEquals(a, b[0]);
    }

    var x = toNumber(a),
        y = toNumber(b);

    // check for special values before coercing to numbers
    if (x!=x || y!=y) {
        x = a;
        y = b;
    }

    // handle text comparison case-insensitive.
    if (isString(x) && isString(y)) {
        if (Process.prototype.isCaseInsensitive) {
            return x.toLowerCase() === y.toLowerCase();
        }
    }
    
    return x === y;
}
Process.prototype.reportBasicSum = function(a,b){
    return toNumber(a)+toNumber(b);
}
Process.prototype.reportBasicDifference = function(a,b){
    return toNumber(a)-toNumber(b);
}
Process.prototype.reportBasicProduct = function(a,b){
    return toNumber(a)*toNumber(b);
}
Process.prototype.reportBasicQuotient = function(a,b){
    return toNumber(a)/toNumber(b);
}
Process.prototype.reportBasicPower = function(a,b){
    return toNumber(a)**toNumber(b);
}
Process.prototype.reportBasicModulus = function(a,b){
    return toNumber(a)%toNumber(b);
}
Process.prototype.reportBasicMin = function(a,b){
    return a<b?a:b;
}
Process.prototype.reportBasicMax = function(a,b){
    return a>b?a:b;
}
Process.prototype.reportBasicLessThan = function(a,b){
    return a<b;
}
Process.prototype.reportBasicGreaterThan = function(a,b){
    return a>b;
}
Process.prototype.reportBasicLessThanThanOrEquals = function(a,b){
    return a<=b;
}
Process.prototype.reportBasicGreaterThanThanOrEquals = function(a,b){
    return a>=b;
}
Process.prototype.reportTypeOf = function (thing) {
    // answer a string denoting the argument's type
    var exp;
    if (thing === null || (thing === undefined)) {
        return 'nothing';
    }
    if (thing === true || (thing === false)) {
        return 'Boolean';
    }
    if (thing instanceof List) {
        return 'list';
    }
    if(typeof thing === 'bigint'){
        return 'bigint';
    }
    if (parseFloat(thing) === +thing) { // I hate this! -Jens
        return 'number';
    }
    if (isString(thing)) {
        return 'text';
    }
    if (thing instanceof SpriteMorph) {
        return 'sprite';
    }
    if (thing instanceof StageMorph) {
        return 'stage';
    }
    if (thing instanceof Costume) {
        return 'costume';
    }
    if (thing instanceof Sound) {
        return 'sound';
    }
    if (thing instanceof Color) {
        return 'color';
    }
    if (thing instanceof Context) {
        if (thing.expression instanceof RingMorph) {
            return thing.expression.dataType();
        }
        if (thing.expression instanceof ReporterBlockMorph) {
            if (thing.expression.isPredicate) {
                return 'predicate';
            }
            return 'reporter';
        }

        if (thing.expression instanceof Array) {
            exp = thing.expression[thing.pc || 0];
            if (exp.isPredicate) {
                return 'predicate';
            }
            if (exp instanceof RingMorph) {
                return exp.dataType();
            }
            if (exp instanceof ReporterBlockMorph) {
                return 'reporter';
            }
            if (exp instanceof HatBlockMorph) {
                return 'hat';
            }
            if (exp instanceof CommandBlockMorph) {
                return 'command';
            }
            return 'reporter'; // 'ring';
        }

        if (thing.expression instanceof HatBlockMorph) {
            return 'hat';
        }
        if (thing.expression instanceof CommandBlockMorph) {
            return 'command';
        }
        return 'reporter'; // 'ring';
    }
    if (thing instanceof Array && isString(thing[0])) {
        return 'selector';
    }
    return 'undefined';
};
SnapExtensions.primitives.set("bigint_new(number)",BigInt);
SnapExtensions.primitives.set("bigint_asNumber(number)",Number);
