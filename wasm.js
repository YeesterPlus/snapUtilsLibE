(()={
function dictFromObject(obj){
    let getter   = k=>k==='...'?dictFromObject(Object.getPrototypeOf(obj)):obj[k],
        setter   = (k,v)=>obj[k]=v,
        has      = k=>Object.hasOwn(obj,k),
        forget   = k=>delete obj[k],
        getLen   = ()=>
            Object.getOwnPropertyNames(obj).length+
            Object.getOwnPropertySymbols(obj).length,
        at       = idx=>(k=>new List([typeof k === 'symbol'?'<<'+k.description+'>>':k,obj[k]]))(
            [...Object.getOwnPropertyNames(obj),
            ...Object.getOwnPropertySymbols(obj)][idx-1]),
        contains = o=>Object.entries(Object.getOwnPropertyDescriptors(obj))
            .find(([k,v])=>snapEquals(o,v.value??v.get?.call?.(obj)));
    let proxy = new List();
    proxy.contents = obj;
    proxy.isProxyToJs = true;
    proxy.at          = at;
    proxy.lookup      = getter;
    proxy.bind        = setter;
    proxy.hasKey      = has;
    proxy.forget      = forget;
    proxy.contains    = contains;
    proxy.length      = getLen;
    return proxy;
}
function objectFromDict(list){
    return Object.fromEntries(list.itemsArray().map(v=>v.itemsArray()));
}
function funcFromRing(ctx){
    if(!(ctx instanceof Context))
        throw new Error('expecting a ring but getting a '+Process.prototype.reportTypeOf(ctx));
    return function(...args){
        let proc = new Process()
        if(this !== window && this != null){
            proc.initializeFor(proc.reportContextFor(
                    ctx,
                    ['undefined','text','Boolean','color','costume','sound']
                        .includes(proc.reportTypeOf(this) ? dictFromObject(this) :
                            this)
                ),
                new List(args)
            );
            proc.context.variables.addVar(Symbol.for('self'), this);
            proc.receiver = world.childThatIsA(IDE_Morph).stage;
        }
        proc.throwError = (err)=>{throw err};
        let deadline = Date.now()+500;
        while(proc.isRunning()){
            proc.runStep();
            if(Date.now()===deadline)
                throw new Error('a synchronous Snap! script took too long');
        }
        return proc.homeContext.inputs[0];
    }
}

function err(err){
    throw err;
}

function addPrimitives(pre,methods){
    if(typeof methods === 'function')
        return SnapExtensions.primitives.set(pre,methods);
    for(let i in methods)
        addPrimitives(pre+'_'+i,methods[i]);
}

function hyperAt(obj,keys){
    if(keys instanceof Array)
        return keys.map(k=>hyperAt(obj,k));
    return obj[keys];
}
function toList(arr){
    if(arr instanceof Array)
        return new List(arr.map(toList));
    return arr
}
let PackedNumberArray = Object.getPrototypeOf(Uint8Array);

addPrimitives('wasm',{
    vmem:{
        'new(size[,max[,shared?])':function(size,max,shared){
            if(arguments.length>4||arguments.length==1)
                throw new Error('expecting 1-3 arguments but got '+(arguments.length-1));
            if(arguments.length<4)
                return arguments.callee(
                    ...[...arguments].slice(0,-1),//specified parameters without proc
                    ...[1,void 0,false,null].slice(4-(arguments.length-1))//defaults
                );
            
            return new WebAssembly.Memory({
                initial:Number(size),
                maximum:max&&Number(max)||void 0,
                shared:Boolean(shared)
            })
        },
        'sizeOf(memory)':function(mem){
            if(mem instanceof List)
                return arguments.callee(
                    mem.lookup('_content')||
                        err(new Error('expecting a vmem but got a list'))
                );
            if(mem instanceof WebAssembly.Memory)
                return mem.buffer.byteLength/0x10000;
            throw new Error('expecting a vmem but got a '+Process.prototype.reportTypeOf(mem));
        },
        'at(memory,idx)':function(mem,idx){
            if(mem instanceof List)
                return arguments.callee(
                    mem.lookup('_content')||
                        err(new Error('expecting a vmem but got a list')),
                        idx
                );
            if(!(mem instanceof WebAssembly.Memory))
                throw new Error('expecting a vmem but got a '+Process.prototype.reportTypeOf(mem));
            
            let this_function = arguments.callee;
            if(idx instanceof List)
                return idx.map(v=>this_function(mem,v));
            let view = new DataView(mem.buffer);
            return view.getUint8(+idx);
        },
        'slice(memory,start,end)':function(mem,start,end){
            if(mem instanceof List)
                return arguments.callee(
                    mem.lookup('_content')||
                        err(new Error('expecting a vmem but got a list')),
                        start,
                        end
                );
            if(!(mem instanceof WebAssembly.Memory))
                throw new Error('expecting a vmem but got a '+Process.prototype.reportTypeOf(mem));
            
            return new List(new Uint8Array(mem.buffer.slice(start-1,end-1)));
        },
        'put(memory,idx,bytes)':function(mem,idx,bytes){
            if(bytes instanceof List)
                return arguments.callee(mem,idx,bytes.itemsArray()??[]);
            if(!(bytes?.buffer))
                throw new Error(
                    'expecing a number list but got a '+
                        (bytes?.at?'list':Process.prototype.reportTypeOf(bytes))
                    );
            if(mem instanceof List)
                return arguments.callee(
                    mem.lookup('_content')||
                        err(new Error('expecting a vmem but got a list')),
                    idx,
                    bytes
                );
            if(!(mem instanceof WebAssembly.Memory))
                throw new Error('expecting a vmem but got a '+Process.prototype.reportTypeOf(mem));
            
            let view = new Uint8Array(mem.buffer);
            let viewsrc = new Uint8Array(bytes.buffer);
            view.set(viewsrc,idx-1)
        },
        'growBy(memory,size)':function(mem,size){
            if(mem instanceof List)
                return arguments.callee(
                    mem.lookup('_content')||
                        err(new Error('expecting a vmem but got a list')),
                        size
                );
            if(mem instanceof WebAssembly.Memory)
                return mem.grow(Number(size));
        }
    },
    mod:{
        'new(bytes)':function(bytes,proc){
            if(proc?.task){
                proc.pushContext('doYield');
                proc.pushContext();
                return;
            }
            if(bytes instanceof List && bytes.contents instanceof PackedNumberArray)
                return arguments.callee(bytes.contents,proc);
            if(!(bytes instanceof PackedNumberArray))
                throw new Error(
                    'expecting a number list but got a '+
                        (bytes instanceof Array?'list':Process.prototype.reportTypeOf(bytes))
                    );

            proc.task = true;
            WebAssembly.compile(bytes).then(
                res=>{
                    (proc??{}).task=false;
                    proc.returnValueToParentContext(res);
                    proc.popContext();
                    proc.runStep();},
                rej=>proc.handleError(rej,proc.context?.expression)
            );
        },
        'imports(module)':function(module){
            if(module instanceof List)
                return arguments.callee(
                    module.lookup('_content')||
                        err(new Error('expecting a module but got a list'))
                );
            if(!(module instanceof WebAssembly.Module))
                throw new Error('expecting a module but got a '+Process.prototype.reportTypeOf(module));
            
            let imports = WebAssembly.Module.imports(module).map(v=>hyperAt(v,['module',['name','kind']]));
            let result = new List();
            for(let i = 0;i < imports.length; i++){
                let key = imports[i][0];
                let val = imports[i][i];
                let pair = result.lookup(key);
                if(pair) pair.add(new List(val));
                else result.add(new List([key,new List([new List(val)])]));
            }
            return result;
        },
        'exports(module)':function(module){
            if(module instanceof List)
                return arguments.callee(
                    module.lookup('_content')||
                        err(new Error('expecting a module but got a list'))
                );
            if(!(module instanceof WebAssembly.Module))
                throw new Error('expecting a module but got a '+Process.prototype.reportTypeOf(module));
            
            return toList(WebAssembly.Module.imports(module).map(v=>hyperAt(v,['name','kind'])));
        }
    },
    inst:{
        'compile(module,imports)':function(module,obj,proc){
            if(proc.task){
                proc.pushContext('doYield');
                proc.pushContext();
                return;
            }
            if(module instanceof List)
                return arguments.callee(
                    module.lookup('_content')||
                        err(new Error('expecting a module but got a list')),obj,proc
                );
            if(!(module instanceof WebAssembly.Module))
                throw new Error('expecting a module but got a '+Process.prototype.reportTypeOf(module));
            
            proc.task = true;
            let imports = objectFromDict(obj);
            for(let k in imports){
                imports[k] = objectFromDict(imports[k]);
                let namespace = imports[k];
                for(let k1 in namespace){
                    if(namespace[k1].lookup&&namespace[k1].lookup('_contents'))
                        namespace[k1] = namespace[k1].lookup('_contents');
                    if(namespace[k1].contents instanceof PackedNumberArray)
                        namespace[k1] = namespace[k1].contents;
                    if(namespace[k1] instanceof Context)
                        namespace[k1] = funcFromRing(namespace[k1]);
                }
            }
            WebAssembly.instantiate(module,imports).then(
                res=>{
                    (proc??{}).task=false;
                    proc.returnValueToParentContext(res);
                    proc.popContext();
                    proc.runStep();},
                rej=>proc.handleError(rej,proc.context?.expression)
            );
        },
        'exports(instance)':function(inst){
            if(inst instanceof List)
                return arguments.callee(
                    inst.lookup('_content')||
                        err(new Error('expecting an instance but got a list'))
                );
            if(!(inst instanceof WebAssembly.Instance))
                throw new Error('expecting an instance but got a '+Process.prototype.reportTypeOf(module));
            
            return new List(Object.entries(inst.exports).map(v=>new List(v)));
        }
    },
    refList:{
        'new(length,onlyWasmFunc?[,maximum])':function(len,onlyWasmFunc,maximum){
            if(arguments.length>4||arguments.length==1)
                throw new Error('expecting 1-3 arguments but got '+(arguments.length-1));
            if(arguments.length<4)
                return arguments.callee(
                    ...[...arguments].slice(0,-1),//specified parameters without proc
                    ...[0,true,void 0,null].slice(4-(arguments.length-1))//defaults
                );

            let length = Number(len),
                opt = onlyWasmFunc ? 'anyfunc' : 'externref',
                max = Number(maximum);
            return new WebAssembly.Table({
                initial:length,
                element:opt,
                maximum:max||void 0
            },null);
        },
        'at(table,idx)':function(table,idx){
            if(table instanceof List)
                return arguments.callee(
                    table.lookup('_content')||
                        err(new Error('expecting a module but got a list')),idx
                );
            if(!(table instanceof WebAssembly.Table))
                throw new Error('expecting a table but got a '+Process.prototype.reportTypeOf(table));
            return table.get(Number(idx)-1)??null;
        },
        'put(table,idx,value)':function(table,idx,value){
            if(table instanceof List)
                return arguments.callee(
                    table.lookup('_content')||
                        err(new Error('expecting a module but got a list')),idx,value
                );
            if(!(table instanceof WebAssembly.Table))
                throw new Error('expecting a table but got a '+Process.prototype.reportTypeOf(table));

            table.set(Number(idx)-1,value);
        },
        'grow(table,elems)':function(table,size){
            if(table instanceof List)
                return arguments.callee(
                    table.lookup('_content')||
                        err(new Error('expecting a module but got a list')),size
                );
            if(!(table instanceof WebAssembly.Table))
                throw new Error('expecting a table but got a '+Process.prototype.reportTypeOf(table));

            return table.grow(Number(size));
        },
        'lengthOf(table)':function(table){
            if(table instanceof List)
                return arguments.callee(
                    table.lookup('_content')||
                        err(new Error('expecting a module but got a list'))
                );
            if(!(table instanceof WebAssembly.Table))
                throw new Error('expecting a table but got a '+Process.prototype.reportTypeOf(table));
            
            return table.length
        }
    },

})
})()
