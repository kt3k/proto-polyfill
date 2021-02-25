const O_PROTO = "__proto__";
const P_PROTO = "___proto_polyfill_proto___";
const P_FUNCT = "___proto_polyfill_funct___";
const P_VALUE = "___proto_polyfill_value___";
const SYMBOL = "Symbol(";

const getPrototypeOf = Object["getPrototypeOf"];
const getOwnPropertyNames = Object["getOwnPropertyNames"];
const defineProperty = Object["defineProperty"];
const getOwnPropertyDescriptor = Object["getOwnPropertyDescriptor"];
const create = Object["create"];

function getFunction(source, name, what) {
  const info = getOwnPropertyDescriptor(source, name);
  const func = info[what];
  return func[P_FUNCT] || func;
}

function prepareFunction(dest, source, name, what) {
  function newFunction() {
    return getFunction(source, name, what).apply(dest, arguments);
  }
  defineProperty(newFunction, P_FUNCT, {
    get: function pFunctionGet() {
      return getFunction(source, name, what);
    },
    enumerable: false,
    configurable: true,
  });
  return newFunction;
}

function setProperty(dest, source, name) {
  const info = getOwnPropertyDescriptor(source, name);
  const hasSetter = info.set instanceof Function;
  const hasGetter = info.get instanceof Function;
  if (hasSetter && hasGetter) {
    defineProperty(dest, name, {
      set: prepareFunction(dest, source, name, "set"),
      get: prepareFunction(dest, source, name, "get"),
      enumerable: info.enumerable || false,
      configurable: true,
    });
  } else if (hasSetter) {
    defineProperty(dest, name, {
      set: prepareFunction(dest, source, name, "set"),
      enumerable: info.enumerable || false,
      configurable: true,
    });
  } else if (hasGetter) {
    defineProperty(dest, name, {
      get: prepareFunction(dest, source, name, "get"),
      enumerable: info.enumerable || false,
      configurable: true,
    });
  } else {
    defineProperty(dest, name, {
      set: function (v) {
        this[P_VALUE][name] = v;
      },
      get: function () {
        return name in this[P_VALUE]
          ? this[P_VALUE][name]
          : this === dest
          ? source[name]
          : dest[name];
      },
      enumerable: info.enumerable || false,
      configurable: true,
    });
  }
}

function setProperties(dest, source) {
  const names = getOwnPropertyNames(source);
  let name;
  let n = 0;
  for (; n < names.length; n++) {
    name = names[n];
    if (
      name &&
      name !== O_PROTO &&
      name !== P_PROTO &&
      name !== P_FUNCT &&
      name !== P_VALUE &&
      name.indexOf(SYMBOL) !== 0 &&
      !dest.hasOwnProperty(name)
    ) {
      setProperty(dest, source, name);
    }
  }
}

function setProto(dest, source) {
  const sourceProto = typeof source === "function" ? source.prototype : source;
  const sourceConstructor = typeof source === "function"
    ? source
    : sourceProto && sourceProto.constructor;
  defineProperty(dest, P_PROTO, {
    value: sourceProto || source,
    enumerable: false,
    configurable: true,
    writable: false,
  });
  defineProperty(dest, P_VALUE, {
    value: {},
    enumerable: false,
    configurable: true,
    writable: false,
  });
  if (!sourceConstructor) {
    return;
  }
  setProperties(dest, sourceConstructor);
}

if (
  !(O_PROTO in Object) &&
  !(O_PROTO in Function) &&
  getPrototypeOf instanceof Function &&
  getOwnPropertyNames instanceof Function &&
  defineProperty instanceof Function &&
  getOwnPropertyDescriptor instanceof Function
) {
  Object["setPrototypeOf"] = function oSetPrototypeOf(obj, proto) {
    if (obj instanceof Object && obj !== null) {
      obj.__proto__ = proto;
    }
    return obj;
  };
  Object["getPrototypeOf"] = function oGetPrototypeOf(obj) {
    return obj instanceof Object && obj !== null
      ? obj.__proto__
      : getPrototypeOf(obj);
  };
  defineProperty(Object, "create", {
    value: function oCreate(source, props) {
      const C = create(source || null, props);
      defineProperty(C, O_PROTO, {
        get: function cGetProto() {
          if (this === C) {
            return source;
          } else {
            return C;
          }
        },
        enumerable: false,
        configurable: true,
      });
      return C;
    },
    enumerable: false,
    configurable: true,
    writable: true,
  });
  defineProperty(Object.prototype, O_PROTO, {
    get: function oGetProto() {
      switch (typeof this) {
        case "string":
          return String.prototype;
        case "number":
          return Number.prototype;
        case "boolean":
          return Boolean.prototype;
      }
      if (P_PROTO in this) {
        return this[P_PROTO];
      }
      const constr = this.constructor;
      if (!constr) {
        return null;
      } else if (typeof constr.prototype === "function") {
        return constr;
      } else if (this instanceof constr) {
        return constr.prototype || null;
      } else {
        const proto = constr.__proto__;
        return this !== Object.prototype && proto.prototype === undefined
          ? Object.prototype
          : proto.prototype || null;
      }
    },
    set: function oSetProto(proto) {
      if (proto && this instanceof Object) {
        defineProperty(this, P_PROTO, {
          value: proto,
          enumerable: false,
          configurable: true,
          writable: false,
        });
        defineProperty(this, P_VALUE, {
          value: {},
          enumerable: false,
          configurable: true,
          writable: false,
        });
        setProperties(this, proto);
      }
    },
    enumerable: false,
    configurable: true,
  });
  defineProperty(Function.prototype, O_PROTO, {
    get: function fGetProto() {
      if (typeof this.prototype === "function") {
        return getPrototypeOf(this.constructor);
      }
      if (!(P_PROTO in this)) {
        if (this.prototype) {
          setProto(this, getPrototypeOf(this));
        } else {
          return Object.prototype;
        }
      }
      if (this[P_PROTO]) {
        return typeof this[P_PROTO] === "function"
          ? this[P_PROTO]
          : this[P_PROTO].constructor;
      } else {
        return null;
      }
    },
    set: function fSetProto(source) {
      setProto(this, source);
    },
    enumerable: false,
    configurable: true,
  });
}

export {};
