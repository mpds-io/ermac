Array.prototype.extend = function(other_array){
    other_array.forEach(function(v){ this.push(v) }, this);
}
String.prototype.startswith = function(prefix){
    return this.indexOf(prefix) === 0;
}
Number.prototype.count_decimals = function(){
    if (isFinite(this) && Math.floor(this) === this) return 0;
    var repr = this.toString();
    if (repr.indexOf(".") == -1) return 0;
    return repr.split(".")[1].length || 0;
}