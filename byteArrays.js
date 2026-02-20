/*
    ----------------------------
    |  Snap! byte list libary  |
    |     by YeesterPlus       |
    ----------------------------
*/
SnapExtensions.primitives.set("byte_asNumberArray(type,list)",function(type,list){
    return new List({
        ["unsigned byte"]:Uint8Array,
        ["unsigned short"]:Uint16Array,
        ["unsigned int"]:Uint32Array,
        
        ["byte"]:Int8Array,
        ["short"]:Int16Array,
        ["int"]:Int32Array,
        
        ["float"]:Float32Array,
        ["real"]:Float64Array
    }[type].from(list.itemsArray()));
})
SnapExtensions.primitives.set("byte_numberArrayCast(array,type)",function(list,type,proc){
    return new List(new {
        ["unsigned byte"]:Uint8Array,
        ["unsigned short"]:Uint16Array,
        ["unsigned int"]:Uint32Array,
        
        ["byte"]:Int8Array,
        ["short"]:Int16Array,
        ["int"]:Int32Array,
        
        ["float"]:Float32Array,
        ["real"]:Float64Array
    }[type](list?.contents?.buffer??(()=>{
        throw new Error("expected a number only list but got a "+proc.reportTypeOf(list))
    })()));
})
SnapExtensions.primitives.set("byte_typeOfNumberArray(array)",function(list){
    return {
        ["Uint8"]:"unsigned byte",
        ["Uint16"]:"unsigned short",
        ["Uint32"]:"unsigned int",

        ["Int8"]:"byte",
        ["Int16"]:"short",
        ["Int32"]:"int",

        ["Float32"]:"float",
        ["Float64"]:"real"
     }[list.itemsArray().constructor.name.slice(0,-"Array".length)]??"none"
})
