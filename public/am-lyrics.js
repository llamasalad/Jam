function __decorate(t, e, i, r) {
  var s,
    n = arguments.length,
    a =
      n < 3 ? e : null === r ? (r = Object.getOwnPropertyDescriptor(e, i)) : r;
  if ("object" == typeof Reflect && "function" == typeof Reflect.decorate)
    a = Reflect.decorate(t, e, i, r);
  else
    for (var o = t.length - 1; o >= 0; o--)
      (s = t[o]) && (a = (n < 3 ? s(a) : n > 3 ? s(e, i, a) : s(e, i)) || a);
  return (n > 3 && a && Object.defineProperty(e, i, a), a);
}
"function" == typeof SuppressedError && SuppressedError;
/**
 * @license
 * Copyright 2019 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t$1 = globalThis,
  e$4 =
    t$1.ShadowRoot &&
    (void 0 === t$1.ShadyCSS || t$1.ShadyCSS.nativeShadow) &&
    "adoptedStyleSheets" in Document.prototype &&
    "replace" in CSSStyleSheet.prototype,
  s$2 = Symbol(),
  o$4 = new WeakMap();
let n$3 = class {
  constructor(t, e, i) {
    if (((this._$cssResult$ = !0), i !== s$2))
      throw Error(
        "CSSResult is not constructable. Use `unsafeCSS` or `css` instead.",
      );
    ((this.cssText = t), (this.t = e));
  }
  get styleSheet() {
    let t = this.o;
    const e = this.t;
    if (e$4 && void 0 === t) {
      const i = void 0 !== e && 1 === e.length;
      (i && (t = o$4.get(e)),
        void 0 === t &&
        ((this.o = t = new CSSStyleSheet()).replaceSync(this.cssText),
          i && o$4.set(e, t)));
    }
    return t;
  }
  toString() {
    return this.cssText;
  }
};
const r$4 = (t) => new n$3("string" == typeof t ? t : t + "", void 0, s$2),
  i$3 = (t, ...e) => {
    const i =
      1 === t.length
        ? t[0]
        : e.reduce(
          (e, i, r) =>
            e +
            ((t) => {
              if (!0 === t._$cssResult$) return t.cssText;
              if ("number" == typeof t) return t;
              throw Error(
                "Value passed to 'css' function must be a 'css' function result: " +
                t +
                ". Use 'unsafeCSS' to pass non-literal values, but take care to ensure page security.",
              );
            })(i) +
            t[r + 1],
          t[0],
        );
    return new n$3(i, t, s$2);
  },
  S$1 = (t, e) => {
    if (e$4)
      t.adoptedStyleSheets = e.map((t) =>
        t instanceof CSSStyleSheet ? t : t.styleSheet,
      );
    else
      for (const i of e) {
        const e = document.createElement("style"),
          r = t$1.litNonce;
        (void 0 !== r && e.setAttribute("nonce", r),
          (e.textContent = i.cssText),
          t.appendChild(e));
      }
  },
  c$2 = e$4
    ? (t) => t
    : (t) =>
      t instanceof CSSStyleSheet
        ? ((t) => {
          let e = "";
          for (const i of t.cssRules) e += i.cssText;
          return r$4(e);
        })(t)
        : t,
  {
    is: i$2,
    defineProperty: e$3,
    getOwnPropertyDescriptor: h$1,
    getOwnPropertyNames: r$3,
    getOwnPropertySymbols: o$3,
    getPrototypeOf: n$2,
  } = Object,
  a$1 = globalThis,
  c$1 = a$1.trustedTypes,
  l$1 = c$1 ? c$1.emptyScript : "",
  p$1 = a$1.reactiveElementPolyfillSupport,
  d$1 = (t, e) => t,
  u$1 = {
    toAttribute(t, e) {
      switch (e) {
        case Boolean:
          t = t ? l$1 : null;
          break;
        case Object:
        case Array:
          t = null == t ? t : JSON.stringify(t);
      }
      return t;
    },
    fromAttribute(t, e) {
      let i = t;
      switch (e) {
        case Boolean:
          i = null !== t;
          break;
        case Number:
          i = null === t ? null : Number(t);
          break;
        case Object:
        case Array:
          try {
            i = JSON.parse(t);
          } catch (t) {
            i = null;
          }
      }
      return i;
    },
  },
  f$1 = (t, e) => !i$2(t, e),
  b$1 = {
    attribute: !0,
    type: String,
    converter: u$1,
    reflect: !1,
    useDefault: !1,
    hasChanged: f$1,
  };
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */ ((Symbol.metadata ??= Symbol("metadata")),
  (a$1.litPropertyMetadata ??= new WeakMap()));
let y$1 = class extends HTMLElement {
  static addInitializer(t) {
    (this._$Ei(), (this.l ??= []).push(t));
  }
  static get observedAttributes() {
    return (this.finalize(), this._$Eh && [...this._$Eh.keys()]);
  }
  static createProperty(t, e = b$1) {
    if (
      (e.state && (e.attribute = !1),
        this._$Ei(),
        this.prototype.hasOwnProperty(t) && ((e = Object.create(e)).wrapped = !0),
        this.elementProperties.set(t, e),
        !e.noAccessor)
    ) {
      const i = Symbol(),
        r = this.getPropertyDescriptor(t, i, e);
      void 0 !== r && e$3(this.prototype, t, r);
    }
  }
  static getPropertyDescriptor(t, e, i) {
    const { get: r, set: s } = h$1(this.prototype, t) ?? {
      get() {
        return this[e];
      },
      set(t) {
        this[e] = t;
      },
    };
    return {
      get: r,
      set(e) {
        const n = r?.call(this);
        (s?.call(this, e), this.requestUpdate(t, n, i));
      },
      configurable: !0,
      enumerable: !0,
    };
  }
  static getPropertyOptions(t) {
    return this.elementProperties.get(t) ?? b$1;
  }
  static _$Ei() {
    if (this.hasOwnProperty(d$1("elementProperties"))) return;
    const t = n$2(this);
    (t.finalize(),
      void 0 !== t.l && (this.l = [...t.l]),
      (this.elementProperties = new Map(t.elementProperties)));
  }
  static finalize() {
    if (this.hasOwnProperty(d$1("finalized"))) return;
    if (
      ((this.finalized = !0),
        this._$Ei(),
        this.hasOwnProperty(d$1("properties")))
    ) {
      const t = this.properties,
        e = [...r$3(t), ...o$3(t)];
      for (const i of e) this.createProperty(i, t[i]);
    }
    const t = this[Symbol.metadata];
    if (null !== t) {
      const e = litPropertyMetadata.get(t);
      if (void 0 !== e)
        for (const [t, i] of e) this.elementProperties.set(t, i);
    }
    this._$Eh = new Map();
    for (const [t, e] of this.elementProperties) {
      const i = this._$Eu(t, e);
      void 0 !== i && this._$Eh.set(i, t);
    }
    this.elementStyles = this.finalizeStyles(this.styles);
  }
  static finalizeStyles(t) {
    const e = [];
    if (Array.isArray(t)) {
      const i = new Set(t.flat(1 / 0).reverse());
      for (const t of i) e.unshift(c$2(t));
    } else void 0 !== t && e.push(c$2(t));
    return e;
  }
  static _$Eu(t, e) {
    const i = e.attribute;
    return !1 === i
      ? void 0
      : "string" == typeof i
        ? i
        : "string" == typeof t
          ? t.toLowerCase()
          : void 0;
  }
  constructor() {
    (super(),
      (this._$Ep = void 0),
      (this.isUpdatePending = !1),
      (this.hasUpdated = !1),
      (this._$Em = null),
      this._$Ev());
  }
  _$Ev() {
    ((this._$ES = new Promise((t) => (this.enableUpdating = t))),
      (this._$AL = new Map()),
      this._$E_(),
      this.requestUpdate(),
      this.constructor.l?.forEach((t) => t(this)));
  }
  addController(t) {
    ((this._$EO ??= new Set()).add(t),
      void 0 !== this.renderRoot && this.isConnected && t.hostConnected?.());
  }
  removeController(t) {
    this._$EO?.delete(t);
  }
  _$E_() {
    const t = new Map(),
      e = this.constructor.elementProperties;
    for (const i of e.keys())
      this.hasOwnProperty(i) && (t.set(i, this[i]), delete this[i]);
    t.size > 0 && (this._$Ep = t);
  }
  createRenderRoot() {
    const t =
      this.shadowRoot ?? this.attachShadow(this.constructor.shadowRootOptions);
    return (S$1(t, this.constructor.elementStyles), t);
  }
  connectedCallback() {
    ((this.renderRoot ??= this.createRenderRoot()),
      this.enableUpdating(!0),
      this._$EO?.forEach((t) => t.hostConnected?.()));
  }
  enableUpdating(t) { }
  disconnectedCallback() {
    this._$EO?.forEach((t) => t.hostDisconnected?.());
  }
  attributeChangedCallback(t, e, i) {
    this._$AK(t, i);
  }
  _$ET(t, e) {
    const i = this.constructor.elementProperties.get(t),
      r = this.constructor._$Eu(t, i);
    if (void 0 !== r && !0 === i.reflect) {
      const s = (
        void 0 !== i.converter?.toAttribute ? i.converter : u$1
      ).toAttribute(e, i.type);
      ((this._$Em = t),
        null == s ? this.removeAttribute(r) : this.setAttribute(r, s),
        (this._$Em = null));
    }
  }
  _$AK(t, e) {
    const i = this.constructor,
      r = i._$Eh.get(t);
    if (void 0 !== r && this._$Em !== r) {
      const t = i.getPropertyOptions(r),
        s =
          "function" == typeof t.converter
            ? { fromAttribute: t.converter }
            : void 0 !== t.converter?.fromAttribute
              ? t.converter
              : u$1;
      ((this._$Em = r),
        (this[r] = s.fromAttribute(e, t.type) ?? this._$Ej?.get(r) ?? null),
        (this._$Em = null));
    }
  }
  requestUpdate(t, e, i) {
    if (void 0 !== t) {
      const r = this.constructor,
        s = this[t];
      if (
        ((i ??= r.getPropertyOptions(t)),
          !(
            (i.hasChanged ?? f$1)(s, e) ||
            (i.useDefault &&
              i.reflect &&
              s === this._$Ej?.get(t) &&
              !this.hasAttribute(r._$Eu(t, i)))
          ))
      )
        return;
      this.C(t, e, i);
    }
    !1 === this.isUpdatePending && (this._$ES = this._$EP());
  }
  C(t, e, { useDefault: i, reflect: r, wrapped: s }, n) {
    (i &&
      !(this._$Ej ??= new Map()).has(t) &&
      (this._$Ej.set(t, n ?? e ?? this[t]), !0 !== s || void 0 !== n)) ||
      (this._$AL.has(t) ||
        (this.hasUpdated || i || (e = void 0), this._$AL.set(t, e)),
        !0 === r && this._$Em !== t && (this._$Eq ??= new Set()).add(t));
  }
  async _$EP() {
    this.isUpdatePending = !0;
    try {
      await this._$ES;
    } catch (t) {
      Promise.reject(t);
    }
    const t = this.scheduleUpdate();
    return (null != t && (await t), !this.isUpdatePending);
  }
  scheduleUpdate() {
    return this.performUpdate();
  }
  performUpdate() {
    if (!this.isUpdatePending) return;
    if (!this.hasUpdated) {
      if (((this.renderRoot ??= this.createRenderRoot()), this._$Ep)) {
        for (const [t, e] of this._$Ep) this[t] = e;
        this._$Ep = void 0;
      }
      const t = this.constructor.elementProperties;
      if (t.size > 0)
        for (const [e, i] of t) {
          const { wrapped: t } = i,
            r = this[e];
          !0 !== t ||
            this._$AL.has(e) ||
            void 0 === r ||
            this.C(e, void 0, i, r);
        }
    }
    let t = !1;
    const e = this._$AL;
    try {
      ((t = this.shouldUpdate(e)),
        t
          ? (this.willUpdate(e),
            this._$EO?.forEach((t) => t.hostUpdate?.()),
            this.update(e))
          : this._$EM());
    } catch (e) {
      throw ((t = !1), this._$EM(), e);
    }
    t && this._$AE(e);
  }
  willUpdate(t) { }
  _$AE(t) {
    (this._$EO?.forEach((t) => t.hostUpdated?.()),
      this.hasUpdated || ((this.hasUpdated = !0), this.firstUpdated(t)),
      this.updated(t));
  }
  _$EM() {
    ((this._$AL = new Map()), (this.isUpdatePending = !1));
  }
  get updateComplete() {
    return this.getUpdateComplete();
  }
  getUpdateComplete() {
    return this._$ES;
  }
  shouldUpdate(t) {
    return !0;
  }
  update(t) {
    ((this._$Eq &&= this._$Eq.forEach((t) => this._$ET(t, this[t]))),
      this._$EM());
  }
  updated(t) { }
  firstUpdated(t) { }
};
((y$1.elementStyles = []),
  (y$1.shadowRootOptions = { mode: "open" }),
  (y$1[d$1("elementProperties")] = new Map()),
  (y$1[d$1("finalized")] = new Map()),
  p$1?.({ ReactiveElement: y$1 }),
  (a$1.reactiveElementVersions ??= []).push("2.1.0"));
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const t = globalThis,
  i$1 = t.trustedTypes,
  s$1 = i$1 ? i$1.createPolicy("lit-html", { createHTML: (t) => t }) : void 0,
  e$2 = "$lit$",
  h = `lit$${Math.random().toFixed(9).slice(2)}$`,
  o$2 = "?" + h,
  n$1 = `<${o$2}>`,
  r$2 = document,
  l = () => r$2.createComment(""),
  c = (t) => null === t || ("object" != typeof t && "function" != typeof t),
  a = Array.isArray,
  u = (t) => a(t) || "function" == typeof t?.[Symbol.iterator],
  d = "[ \t\n\f\r]",
  f = /<(?:(!--|\/[^a-zA-Z])|(\/?[a-zA-Z][^>\s]*)|(\/?$))/g,
  v = /-->/g,
  _ = />/g,
  m = RegExp(
    `>|${d}(?:([^\\s"'>=/]+)(${d}*=${d}*(?:[^ \t\n\f\r"'\`<>=]|("|')|))|$)`,
    "g",
  ),
  p = /'/g,
  g = /"/g,
  $ = /^(?:script|style|textarea|title)$/i,
  y =
    (t) =>
      (e, ...i) => ({ _$litType$: t, strings: e, values: i }),
  x = y(1),
  b = y(2),
  T = Symbol.for("lit-noChange"),
  E = Symbol.for("lit-nothing"),
  A = new WeakMap(),
  C = r$2.createTreeWalker(r$2, 129);
function P(t, e) {
  if (!a(t) || !t.hasOwnProperty("raw"))
    throw Error("invalid template strings array");
  return void 0 !== s$1 ? s$1.createHTML(e) : e;
}
const V = (t, e) => {
  const i = t.length - 1,
    r = [];
  let s,
    n = 2 === e ? "<svg>" : 3 === e ? "<math>" : "",
    a = f;
  for (let e = 0; e < i; e++) {
    const i = t[e];
    let o,
      l,
      c = -1,
      d = 0;
    for (; d < i.length && ((a.lastIndex = d), (l = a.exec(i)), null !== l);)
      ((d = a.lastIndex),
        a === f
          ? "!--" === l[1]
            ? (a = v)
            : void 0 !== l[1]
              ? (a = _)
              : void 0 !== l[2]
                ? ($.test(l[2]) && (s = RegExp("</" + l[2], "g")), (a = m))
                : void 0 !== l[3] && (a = m)
          : a === m
            ? ">" === l[0]
              ? ((a = s ?? f), (c = -1))
              : void 0 === l[1]
                ? (c = -2)
                : ((c = a.lastIndex - l[2].length),
                  (o = l[1]),
                  (a = void 0 === l[3] ? m : '"' === l[3] ? g : p))
            : a === g || a === p
              ? (a = m)
              : a === v || a === _
                ? (a = f)
                : ((a = m), (s = void 0)));
    const u = a === m && t[e + 1].startsWith("/>") ? " " : "";
    n +=
      a === f
        ? i + n$1
        : c >= 0
          ? (r.push(o), i.slice(0, c) + e$2 + i.slice(c) + h + u)
          : i + h + (-2 === c ? e : u);
  }
  return [
    P(t, n + (t[i] || "<?>") + (2 === e ? "</svg>" : 3 === e ? "</math>" : "")),
    r,
  ];
};
class N {
  constructor({ strings: t, _$litType$: e }, i) {
    let r;
    this.parts = [];
    let s = 0,
      n = 0;
    const a = t.length - 1,
      o = this.parts,
      [c, d] = V(t, e);
    if (
      ((this.el = N.createElement(c, i)),
        (C.currentNode = this.el.content),
        2 === e || 3 === e)
    ) {
      const t = this.el.content.firstChild;
      t.replaceWith(...t.childNodes);
    }
    for (; null !== (r = C.nextNode()) && o.length < a;) {
      if (1 === r.nodeType) {
        if (r.hasAttributes())
          for (const t of r.getAttributeNames())
            if (t.endsWith(e$2)) {
              const e = d[n++],
                i = r.getAttribute(t).split(h),
                a = /([.?@])?(.*)/.exec(e);
              (o.push({
                type: 1,
                index: s,
                name: a[2],
                strings: i,
                ctor:
                  "." === a[1] ? H : "?" === a[1] ? I : "@" === a[1] ? L : k,
              }),
                r.removeAttribute(t));
            } else
              t.startsWith(h) &&
                (o.push({ type: 6, index: s }), r.removeAttribute(t));
        if ($.test(r.tagName)) {
          const t = r.textContent.split(h),
            e = t.length - 1;
          if (e > 0) {
            r.textContent = i$1 ? i$1.emptyScript : "";
            for (let i = 0; i < e; i++)
              (r.append(t[i], l()),
                C.nextNode(),
                o.push({ type: 2, index: ++s }));
            r.append(t[e], l());
          }
        }
      } else if (8 === r.nodeType)
        if (r.data === o$2) o.push({ type: 2, index: s });
        else {
          let t = -1;
          for (; -1 !== (t = r.data.indexOf(h, t + 1));)
            (o.push({ type: 7, index: s }), (t += h.length - 1));
        }
      s++;
    }
  }
  static createElement(t, e) {
    const i = r$2.createElement("template");
    return ((i.innerHTML = t), i);
  }
}
function S(t, e, i = t, r) {
  if (e === T) return e;
  let s = void 0 !== r ? i._$Co?.[r] : i._$Cl;
  const n = c(e) ? void 0 : e._$litDirective$;
  return (
    s?.constructor !== n &&
    (s?._$AO?.(!1),
      void 0 === n ? (s = void 0) : ((s = new n(t)), s._$AT(t, i, r)),
      void 0 !== r ? ((i._$Co ??= [])[r] = s) : (i._$Cl = s)),
    void 0 !== s && (e = S(t, s._$AS(t, e.values), s, r)),
    e
  );
}
class M {
  constructor(t, e) {
    ((this._$AV = []), (this._$AN = void 0), (this._$AD = t), (this._$AM = e));
  }
  get parentNode() {
    return this._$AM.parentNode;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  u(t) {
    const {
      el: { content: e },
      parts: i,
    } = this._$AD,
      r = (t?.creationScope ?? r$2).importNode(e, !0);
    C.currentNode = r;
    let s = C.nextNode(),
      n = 0,
      a = 0,
      o = i[0];
    for (; void 0 !== o;) {
      if (n === o.index) {
        let e;
        (2 === o.type
          ? (e = new R(s, s.nextSibling, this, t))
          : 1 === o.type
            ? (e = new o.ctor(s, o.name, o.strings, this, t))
            : 6 === o.type && (e = new z(s, this, t)),
          this._$AV.push(e),
          (o = i[++a]));
      }
      n !== o?.index && ((s = C.nextNode()), n++);
    }
    return ((C.currentNode = r$2), r);
  }
  p(t) {
    let e = 0;
    for (const i of this._$AV)
      (void 0 !== i &&
        (void 0 !== i.strings
          ? (i._$AI(t, i, e), (e += i.strings.length - 2))
          : i._$AI(t[e])),
        e++);
  }
}
class R {
  get _$AU() {
    return this._$AM?._$AU ?? this._$Cv;
  }
  constructor(t, e, i, r) {
    ((this.type = 2),
      (this._$AH = E),
      (this._$AN = void 0),
      (this._$AA = t),
      (this._$AB = e),
      (this._$AM = i),
      (this.options = r),
      (this._$Cv = r?.isConnected ?? !0));
  }
  get parentNode() {
    let t = this._$AA.parentNode;
    const e = this._$AM;
    return (void 0 !== e && 11 === t?.nodeType && (t = e.parentNode), t);
  }
  get startNode() {
    return this._$AA;
  }
  get endNode() {
    return this._$AB;
  }
  _$AI(t, e = this) {
    ((t = S(this, t, e)),
      c(t)
        ? t === E || null == t || "" === t
          ? (this._$AH !== E && this._$AR(), (this._$AH = E))
          : t !== this._$AH && t !== T && this._(t)
        : void 0 !== t._$litType$
          ? this.$(t)
          : void 0 !== t.nodeType
            ? this.T(t)
            : u(t)
              ? this.k(t)
              : this._(t));
  }
  O(t) {
    return this._$AA.parentNode.insertBefore(t, this._$AB);
  }
  T(t) {
    this._$AH !== t && (this._$AR(), (this._$AH = this.O(t)));
  }
  _(t) {
    (this._$AH !== E && c(this._$AH)
      ? (this._$AA.nextSibling.data = t)
      : this.T(r$2.createTextNode(t)),
      (this._$AH = t));
  }
  $(t) {
    const { values: e, _$litType$: i } = t,
      r =
        "number" == typeof i
          ? this._$AC(t)
          : (void 0 === i.el &&
            (i.el = N.createElement(P(i.h, i.h[0]), this.options)),
            i);
    if (this._$AH?._$AD === r) this._$AH.p(e);
    else {
      const t = new M(r, this),
        i = t.u(this.options);
      (t.p(e), this.T(i), (this._$AH = t));
    }
  }
  _$AC(t) {
    let e = A.get(t.strings);
    return (void 0 === e && A.set(t.strings, (e = new N(t))), e);
  }
  k(t) {
    a(this._$AH) || ((this._$AH = []), this._$AR());
    const e = this._$AH;
    let i,
      r = 0;
    for (const s of t)
      (r === e.length
        ? e.push((i = new R(this.O(l()), this.O(l()), this, this.options)))
        : (i = e[r]),
        i._$AI(s),
        r++);
    r < e.length && (this._$AR(i && i._$AB.nextSibling, r), (e.length = r));
  }
  _$AR(t = this._$AA.nextSibling, e) {
    for (this._$AP?.(!1, !0, e); t && t !== this._$AB;) {
      const e = t.nextSibling;
      (t.remove(), (t = e));
    }
  }
  setConnected(t) {
    void 0 === this._$AM && ((this._$Cv = t), this._$AP?.(t));
  }
}
class k {
  get tagName() {
    return this.element.tagName;
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  constructor(t, e, i, r, s) {
    ((this.type = 1),
      (this._$AH = E),
      (this._$AN = void 0),
      (this.element = t),
      (this.name = e),
      (this._$AM = r),
      (this.options = s),
      i.length > 2 || "" !== i[0] || "" !== i[1]
        ? ((this._$AH = Array(i.length - 1).fill(new String())),
          (this.strings = i))
        : (this._$AH = E));
  }
  _$AI(t, e = this, i, r) {
    const s = this.strings;
    let n = !1;
    if (void 0 === s)
      ((t = S(this, t, e, 0)),
        (n = !c(t) || (t !== this._$AH && t !== T)),
        n && (this._$AH = t));
    else {
      const r = t;
      let a, o;
      for (t = s[0], a = 0; a < s.length - 1; a++)
        ((o = S(this, r[i + a], e, a)),
          o === T && (o = this._$AH[a]),
          (n ||= !c(o) || o !== this._$AH[a]),
          o === E ? (t = E) : t !== E && (t += (o ?? "") + s[a + 1]),
          (this._$AH[a] = o));
    }
    n && !r && this.j(t);
  }
  j(t) {
    t === E
      ? this.element.removeAttribute(this.name)
      : this.element.setAttribute(this.name, t ?? "");
  }
}
class H extends k {
  constructor() {
    (super(...arguments), (this.type = 3));
  }
  j(t) {
    this.element[this.name] = t === E ? void 0 : t;
  }
}
class I extends k {
  constructor() {
    (super(...arguments), (this.type = 4));
  }
  j(t) {
    this.element.toggleAttribute(this.name, !!t && t !== E);
  }
}
class L extends k {
  constructor(t, e, i, r, s) {
    (super(t, e, i, r, s), (this.type = 5));
  }
  _$AI(t, e = this) {
    if ((t = S(this, t, e, 0) ?? E) === T) return;
    const i = this._$AH,
      r =
        (t === E && i !== E) ||
        t.capture !== i.capture ||
        t.once !== i.once ||
        t.passive !== i.passive,
      s = t !== E && (i === E || r);
    (r && this.element.removeEventListener(this.name, this, i),
      s && this.element.addEventListener(this.name, this, t),
      (this._$AH = t));
  }
  handleEvent(t) {
    "function" == typeof this._$AH
      ? this._$AH.call(this.options?.host ?? this.element, t)
      : this._$AH.handleEvent(t);
  }
}
class z {
  constructor(t, e, i) {
    ((this.element = t),
      (this.type = 6),
      (this._$AN = void 0),
      (this._$AM = e),
      (this.options = i));
  }
  get _$AU() {
    return this._$AM._$AU;
  }
  _$AI(t) {
    S(this, t);
  }
}
const j = t.litHtmlPolyfillSupport;
(j?.(N, R), (t.litHtmlVersions ??= []).push("3.3.0"));
const B = (t, e, i) => {
  const r = i?.renderBefore ?? e;
  let s = r._$litPart$;
  if (void 0 === s) {
    const t = i?.renderBefore ?? null;
    r._$litPart$ = s = new R(e.insertBefore(l(), t), t, void 0, i ?? {});
  }
  return (s._$AI(t), s);
  /**
   * @license
   * Copyright 2017 Google LLC
   * SPDX-License-Identifier: BSD-3-Clause
   */
},
  s = globalThis;
class i extends y$1 {
  constructor() {
    (super(...arguments),
      (this.renderOptions = { host: this }),
      (this._$Do = void 0));
  }
  createRenderRoot() {
    const t = super.createRenderRoot();
    return ((this.renderOptions.renderBefore ??= t.firstChild), t);
  }
  update(t) {
    const e = this.render();
    (this.hasUpdated || (this.renderOptions.isConnected = this.isConnected),
      super.update(t),
      (this._$Do = B(e, this.renderRoot, this.renderOptions)));
  }
  connectedCallback() {
    (super.connectedCallback(), this._$Do?.setConnected(!0));
  }
  disconnectedCallback() {
    (super.disconnectedCallback(), this._$Do?.setConnected(!1));
  }
  render() {
    return T;
  }
}
((i._$litElement$ = !0),
  (i.finalized = !0),
  s.litElementHydrateSupport?.({ LitElement: i }));
const o$1 = s.litElementPolyfillSupport;
(o$1?.({ LitElement: i }), (s.litElementVersions ??= []).push("4.2.0"));
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */
const o = {
  attribute: !0,
  type: String,
  converter: u$1,
  reflect: !1,
  hasChanged: f$1,
},
  r$1 = (t = o, e, i) => {
    const { kind: r, metadata: s } = i;
    let n = globalThis.litPropertyMetadata.get(s);
    if (
      (void 0 === n && globalThis.litPropertyMetadata.set(s, (n = new Map())),
        "setter" === r && ((t = Object.create(t)).wrapped = !0),
        n.set(i.name, t),
        "accessor" === r)
    ) {
      const { name: r } = i;
      return {
        set(i) {
          const s = e.get.call(this);
          (e.set.call(this, i), this.requestUpdate(r, s, t));
        },
        init(e) {
          return (void 0 !== e && this.C(r, void 0, t, e), e);
        },
      };
    }
    if ("setter" === r) {
      const { name: r } = i;
      return function (i) {
        const s = this[r];
        (e.call(this, i), this.requestUpdate(r, s, t));
      };
    }
    throw Error("Unsupported decorator location: " + r);
  };
function n(t) {
  return (e, i) =>
    "object" == typeof i
      ? r$1(t, e, i)
      : ((t, e, i) => {
        const r = e.hasOwnProperty(i);
        return (
          e.constructor.createProperty(i, t),
          r ? Object.getOwnPropertyDescriptor(e, i) : void 0
        );
      })(t, e, i);
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */ function r(t) {
  return n({ ...t, state: !0, attribute: !1 });
}
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */ const e$1 = (t, e, i) => (
  (i.configurable = !0),
  (i.enumerable = !0),
  Reflect.decorate && "object" != typeof e && Object.defineProperty(t, e, i),
  i
);
/**
 * @license
 * Copyright 2017 Google LLC
 * SPDX-License-Identifier: BSD-3-Clause
 */ function e(t, e) {
  return (e, i, r) =>
    e$1(e, i, {
      get() {
        return ((e) => e.renderRoot?.querySelector(t) ?? null)(this);
      },
    });
}
const CONFIG = {
  GOOGLE: { MAX_RETRIES: 3, RETRY_DELAY_MS: 1e3, FETCH_TIMEOUT_MS: 6e3 },
};
class GoogleService {
  static delay(t) {
    return new Promise((e) => {
      setTimeout(e, t);
    });
  }
  static fetchWithTimeout(t, e = CONFIG.GOOGLE.FETCH_TIMEOUT_MS) {
    const i = new AbortController(),
      r = setTimeout(() => i.abort(), e);
    return fetch(t, { signal: i.signal }).finally(() => clearTimeout(r));
  }
  static isPurelyLatinScript(t) {
    return /^[\u0000-\u007F\u0080-\u00FF\u0100-\u017F\u0180-\u024F]*$/.test(t);
  }
  static async translate(t, e) {
    if (!t || (Array.isArray(t) && 0 === t.length))
      return Array.isArray(t) ? [] : "";
    const i = Array.isArray(t),
      r = i ? t : [t],
      s = [],
      n = [];
    if (
      (r.forEach((t, e) => {
        t && t.trim() && (s.push(e), n.push(t));
      }),
        0 === n.length)
    )
      return i ? r : r[0];
    const a = new Array(n.length).fill("");
    let o = [],
      l = [],
      c = 0;
    const d = async (t, i) => {
      if (0 === t.length) return;
      const r = t.join("\n");
      let s = 0,
        n = !1;
      for (; s < CONFIG.GOOGLE.MAX_RETRIES && !n;)
        try {
          const s = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=${e}&dt=t&q=${encodeURIComponent(r)}`,
            o = await GoogleService.fetchWithTimeout(s);
          if (!o.ok) throw new Error(`Status ${o.status}`);
          const l = await o.json(),
            c = (l?.[0]?.map((t) => t?.[0]).join("") || "").split("\n");
          (i.forEach((e, i) => {
            i < c.length ? (a[e] = c[i]) : (a[e] = t[i]);
          }),
            (n = !0));
        } catch (e) {
          ((s += 1),
            s < CONFIG.GOOGLE.MAX_RETRIES
              ? await GoogleService.delay(
                CONFIG.GOOGLE.RETRY_DELAY_MS * 2 ** (s - 1),
              )
              : i.forEach((e, i) => {
                a[e] = t[i];
              }));
        }
    };
    for (let t = 0; t < n.length; t += 1) {
      const e = n[t];
      (c + e.length > 1500 && (await d(o, l), (o = []), (l = []), (c = 0)),
        o.push(e),
        l.push(t),
        (c += e.length));
    }
    o.length > 0 && (await d(o, l));
    const h = [...r];
    return (
      s.forEach((t, e) => {
        h[t] = a[e];
      }),
      i ? h : h[0]
    );
  }
  static async romanize(t) {
    const e = Array.isArray(t) ? t : t.data || t.content || [];
    if (!e || 0 === e.length) return Array.isArray(t) ? t : [];
    const i = e.some(
      (t) =>
        !1 !== t.isWordSynced && Array.isArray(t.text) && t.text.length > 1,
    );
    return i ? this.romanizeWordSynced(e) : this.romanizeLineSynced(e);
  }
  static async romanizeWordSynced(t) {
    return Promise.all(
      t.map(async (t) => {
        if (
          !t.text ||
          !Array.isArray(t.text) ||
          0 === t.text.length ||
          t.romanizedText
        )
          return t;
        const e = t.text.map((t) => t.text).join(""),
          [i] = await this.romanizeTexts([e]),
          r = t.text.map((t) => ({ ...t, romanizedText: t.romanizedText }));
        return { ...t, text: r, romanizedText: i || "" };
      }),
    );
  }
  static async romanizeLineSynced(t) {
    const e = t.map((t) =>
      t.romanizedText
        ? ""
        : Array.isArray(t.text) && t.text.length > 0
          ? t.text.map((t) => t.text).join("")
          : "",
    ),
      i = await this.romanizeTexts(e);
    return t.map((t, e) => ({ ...t, romanizedText: i[e] || "" }));
  }
  static async romanizeTexts(t) {
    const e = t.join(" ");
    if (GoogleService.isPurelyLatinScript(e)) return t;
    const i = [];
    for (const e of t)
      if (!e || GoogleService.isPurelyLatinScript(e)) i.push(e);
      else {
        let t = 0,
          r = !1,
          s = null;
        for (; t < CONFIG.GOOGLE.MAX_RETRIES && !r;)
          try {
            const t = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=auto&tl=en&dt=rm&q=${encodeURIComponent(e)}`,
              s = await GoogleService.fetchWithTimeout(t),
              n = await s.json(),
              a = n?.[0]?.[0]?.[3] || e;
            (i.push(a), (r = !0));
          } catch (i) {
            ((s = i),
              console.warn(
                `GoogleService: Error romanizing text "${e}" (attempt ${t + 1}/${CONFIG.GOOGLE.MAX_RETRIES}):`,
                i,
              ),
              (t += 1),
              t < CONFIG.GOOGLE.MAX_RETRIES &&
              (await GoogleService.delay(
                CONFIG.GOOGLE.RETRY_DELAY_MS * 2 ** (t - 1),
              )));
          }
        r ||
          (console.error(
            `GoogleService: Failed to romanize text "${e}" after ${CONFIG.GOOGLE.MAX_RETRIES} attempts. Last error:`,
            s,
          ),
            i.push(e));
      }
    return i;
  }
}
function secondsToMs(t, e = 0) {
  return "number" == typeof t && Number.isFinite(t)
    ? Math.max(0, Math.round(1e3 * t))
    : e;
}
function webUrl(t) {
  if ("string" == typeof t)
    try {
      const e = new URL(t);
      return "https:" === e.protocol || "http:" === e.protocol
        ? e.href
        : void 0;
    } catch {
      return;
    }
}
function spicyContributors(t) {
  if (!t || "object" != typeof t) return [];
  const e = new Map();
  return (
    Object.entries(t).forEach(([t, i]) => {
      (Array.isArray(i) ? i : [i]).forEach((i) => {
        if ("string" != typeof i?.username || !i.username.trim()) return;
        const r = webUrl(i.url),
          s = i.id || r || i.username,
          n = e.get(s);
        n
          ? n.roles.includes(t) || n.roles.push(t)
          : e.set(s, {
            username: i.username,
            url: r,
            avatar: webUrl(i.avatar),
            roles: [t],
          });
      });
    }),
    [...e.values()]
  );
}
function parseSpicyLyrics(t) {
  const e = t?.Body;
  if (!e || !["Syllable", "Line", "Static"].includes(e.Type)) return null;
  const i = "Syllable" === e.Type,
    r = "Static" === e.Type,
    s = r ? e.Lines : e.Content;
  if (!Array.isArray(s)) return null;
  const n = (t) => {
    if (!Array.isArray(t?.Syllables)) return [];
    const e = t.Syllables.filter(
      (t) => "string" == typeof t?.Text && t.Text.length,
    );
    return e.map((i, r) => {
      const s = !i.IsPartOfWord && r < e.length - 1 ? " " : "";
      return {
        text: i.Text + s,
        part: Boolean(i.IsPartOfWord),
        timestamp: secondsToMs(i.StartTime, secondsToMs(t.StartTime)),
        endtime: secondsToMs(i.EndTime, secondsToMs(t.EndTime)),
        romanizedText:
          "string" == typeof i.TransliteratedText
            ? i.TransliteratedText + s
            : void 0,
      };
    });
  },
    a = [];
  if (
    (s.forEach((t) => {
      if (!t || (!r && "Vocal" !== t.Type)) return;
      const e = i ? t.Lead : t;
      if (!e) return;
      let s = [];
      if (
        (i
          ? (s = n(e))
          : "string" == typeof e.Text &&
          e.Text.trim() &&
          (s = [
            {
              text: e.Text,
              part: !1,
              timestamp: r ? 0 : secondsToMs(e.StartTime),
              endtime: r ? 0 : secondsToMs(e.EndTime),
              lineSynced: !0,
            },
          ]),
          !s.length)
      )
        return;
      const o = Array.isArray(t.Background)
        ? t.Background.map(n).filter((t) => t.length)
        : [],
        l = [];
      o.forEach((t, e) => {
        if (e && l.length) {
          const t = l[l.length - 1];
          ((t.text += " "), (t.part = !1));
        }
        l.push(...t);
      });
      const c = r
        ? 0
        : secondsToMs(e.StartTime, Math.min(...s.map((t) => t.timestamp))),
        d = r
          ? 0
          : secondsToMs(e.EndTime, Math.max(...s.map((t) => t.endtime)));
      a.push({
        text: s,
        background: l.length > 0,
        backgroundText: l,
        oppositeTurn: Boolean(t.OppositeAligned),
        alignment: t.OppositeAligned ? "end" : "start",
        timestamp: c,
        endtime: Math.max(c, d),
        isWordSynced: i,
        romanizedText: e.TransliteratedText,
        translation: e.TranslatedText,
      });
    }),
      !a.length)
  )
    return null;
  const o =
    { apple_music: " (Apple Music)", spotify: " (Spotify)" }[e.source] || "";
  return {
    lines: a,
    source: `Spicy Lyrics${o}`,
    songwriters: Array.isArray(e.SongWriters)
      ? e.SongWriters.filter((t) => "string" == typeof t).join(", ")
      : void 0,
    contributors:
      "spicy_lyrics" === e.source
        ? spicyContributors(e.UploadAttribution)
        : void 0,
  };
}
const VERSION = "1.8.7",
  SPICY_LYRICS_CLIENT_KEY = "sl_pk_8nNuJf0L-xFUv8L5uU-pfin69WU4j3IzzV2-T3GPWKY",
  SPOTIFY_TOKEN_URL =
    "https://flxgjwpkztgpdywkgckk.supabase.co/functions/v1/spotify-token",
  INSTRUMENTAL_THRESHOLD_MS = 7e3,
  FETCH_TIMEOUT_MS = 8e3,
  LRC_RED_TIMEOUT_MS = 3e3,
  SEEK_THRESHOLD_MS = 500,
  SCROLL_ANIMATION_DURATION_MS = 350,
  BACKGROUND_EXIT_DURATION_MS = 450,
  USER_SCROLL_RESUME_DELAY_MS = 5e3,
  GAP_PULSE_DURATION_MS = 4e3,
  GAP_ENTRY_FADE_MS = 160,
  GAP_ENTRY_SCALE_MS = 400,
  GAP_COLLAPSE_LEAD_MS = 500,
  GAP_EXIT_LEAD_MS = 350,
  GAP_EXIT_TRAIL_MS = 250,
  GAP_BREATH_MIN_SCALE = 0.85,
  GAP_BREATH_MAX_SCALE = 1.12,
  GAP_EXIT_POP_SCALE = 1.2,
  GAP_EXIT_POP_PROGRESS = 0.35,
  NEXT_WORD_PRE_WIPE_MAX_GAP_MS = 180,
  NEXT_WORD_PRE_WIPE_MIN_DURATION_MS = 80,
  NEXT_WORD_PRE_WIPE_MAX_DURATION_MS = 240,
  BASE_WIPE_GRADIENT_EM = 0.75,
  CJK_WIPE_GRADIENT_EM = 0.3,
  LONG_WORD_WIPE_EXTRA_EM = 0.45,
  LONG_WORD_WIPE_EXTRA_RATIO = 0.35,
  WORD_PRE_WIPE_HANDOFF_LEAD_MS = 100,
  WORD_WIPE_LOOKAHEAD_MS = 500,
  NEXT_LINE_BASE_BLUR_EM = 0.02,
  NEXT_LINE_UNBLUR_DURATION_MS = 2e3,
  NORMAL_WORD_SPRING_DURATION_MS = 2e3;
function fetchWithTimeout(t, e = {}, i = 8e3) {
  const r = new AbortController(),
    s = setTimeout(() => r.abort(), i);
  return fetch(t, { ...e, signal: r.signal }).finally(() => clearTimeout(s));
}
const KPOE_SERVERS = ["https://lyricsplus.binimum.org"],
  DEFAULT_KPOE_SOURCE_ORDER =
    "apple,lyricsplus,musixmatch,spotify,qq,deezer,musixmatch-word",
  GENIUS_WORKER_URL = "https://fetch-genius.samidy.workers.dev/";
class AmLyrics extends i {
  constructor() {
    (super(...arguments),
      (this.downloadFormat = "auto"),
      (this.highlightColor = "#ffffff"),
      (this.autoScroll = !0),
      (this.interpolate = !0),
      (this.noAutoAlternates = !1),
      (this.noBlur = !1),
      (this.hidePlayedLines = !1),
      (this.reducedMotion = !1),
      (this.lineMotion = "staggered"),
      (this.systemReducedMotion = !1),
      (this.handleMotionPreference = (t) => {
        this.systemReducedMotion = t.matches;
      }),
      (this.showRomanization = !1),
      (this.showTranslation = !1),
      (this._currentTime = 0),
      (this.rewindingLines = new Set()),
      (this.rewindFrame = 0),
      (this.rewindEffects = []),
      (this.isLoading = !1),
      (this.activeLineIndices = []),
      (this.lineHighlightEnds = []),
      (this.backgroundWraps = new WeakMap()),
      (this.lyricsSource = null),
      (this.availableSources = []),
      (this.currentSourceIndex = 0),
      (this.isFetchingAlternatives = !1),
      (this.hasFetchedAllProviders = !1),
      (this.hasFetchedSpicyLyrics = !1),
      (this.lastInstrumentalIndex = null),
      (this.isUserScrolling = !1),
      (this.isProgrammaticScroll = !1),
      (this.isClickSeeking = !1),
      (this.cachedLyricsLines = []),
      (this.cachedLineArray = []),
      (this.lineElementCache = new Map()),
      (this.gapElementCache = new Map()),
      (this.gapAnimations = new Map()),
      (this.gapDotCache = new WeakMap()),
      (this.gapExitDurationCache = new WeakMap()),
      (this.gapCollapseDurationCache = new WeakMap()),
      (this.cachedAllGaps = []),
      (this.cachedIsUnsynced = !1),
      (this.cachedLineData = null),
      (this.activeLineIds = new Set()),
      (this.currentPrimaryActiveLine = null),
      (this.lastPrimaryActiveLine = null),
      (this.backgroundExpandedLines = new Set()),
      (this.backgroundAnimations = new Map()),
      (this.contentSprings = new Map()),
      (this.currentScrollOffset = 0),
      (this.lastActiveIndex = 0),
      (this.visibleLineIds = new Set()),
      (this.preActiveLineElements = []),
      (this.progressiveBlurLine = null),
      (this.positionedLineElements = []),
      (this.activeGapLineElements = []),
      (this._boundHandleUserScroll = this.handleUserScroll.bind(this)),
      (this.pendingLayoutOffsets = new Map()),
      (this.lineSprings = new Map()));
  }
  get shouldReduceMotion() {
    return this.reducedMotion || this.systemReducedMotion;
  }
  async toggleRomanization() {
    ((this.showRomanization = !this.showRomanization),
      await this.applyRomanization());
  }
  async applyRomanization() {
    if (!this.noAutoAlternates && this.showRomanization && this.lyrics) {
      const t = this.lyrics.some(
        (t) =>
          !(t.romanizedText || (t.text && t.text.some((t) => t.romanizedText))),
      );
      if (t) {
        this.isLoading = !0;
        try {
          const t = await GoogleService.romanize(this.lyrics);
          this.lyrics = t;
        } catch (t) {
          console.error("Romanization failed", t);
        } finally {
          this.isLoading = !1;
        }
      }
    }
  }
  async toggleTranslation() {
    ((this.showTranslation = !this.showTranslation),
      await this.applyTranslation());
  }
  async applyTranslation() {
    if (!this.noAutoAlternates && this.showTranslation && this.lyrics) {
      const t = this.lyrics.some((t) => !t.translation);
      if (t) {
        this.isLoading = !0;
        try {
          const t = this.lyrics.map((t) =>
            t.translation ? "" : t.text.map((t) => t.text).join(""),
          );
          if (t.every((t) => !t)) return void (this.isLoading = !1);
          const e = await GoogleService.translate(t, "en"),
            i = Array.isArray(e) ? e : [e],
            r = this.lyrics.map((t, e) =>
              t.translation ? t : { ...t, translation: i[e] || void 0 },
            );
          this.lyrics = r;
        } catch (t) {
          console.error("Translation failed", t);
        } finally {
          this.isLoading = !1;
        }
      }
    }
  }
  finishLineRewind() {
    (cancelAnimationFrame(this.rewindFrame), (this.rewindFrame = 0));
    for (const { animation: t } of this.rewindEffects)
      if (
        "idle" !== t.playState &&
        Number(t.currentTime) < Number(t.effect?.getComputedTiming().endTime)
      ) {
        const e = t.currentTime;
        (t.play(), (t.currentTime = e));
      }
    this.rewindEffects = [];
    for (const t of this.rewindingLines)
      t.querySelectorAll(".shared-word-wipe").forEach((t) =>
        t.style.removeProperty("transition"),
      );
    this.rewindingLines.clear();
  }
  startLineRewind(t, e) {
    (this.finishLineRewind(), (this.rewindingLines = new Set(t)));
    for (const i of t) {
      for (const t of AmLyrics.motionWords.get(i) || []) {
        t.wipe &&
          e < t.wipe.end &&
          (t.wipe.settled ||
            t.wipe.animations.some((t) => "idle" === t.playState)) &&
          AmLyrics.startWordWipe(t.wipe, t.wipe.end, t.wipe.epoch, !0);
        const i = AmLyrics.normalWordMotions.get(t.element);
        i?.settled &&
          e < i.start + 2e3 &&
          AmLyrics.startNormalWordMotion(i, 2e3);
      }
      for (const t of AmLyrics.motionSyllables.get(i) || []) {
        const i = AmLyrics.motionParameters.get(t);
        for (const t of i?.chars || []) {
          const i = AmLyrics.characterAnimations.get(t);
          i?.settled &&
            e < i.start + i.end &&
            AmLyrics.resumeCharacterMotion(t, i.end);
        }
      }
    }
    (t
      .flatMap((t) => t.getAnimations({ subtree: !0 }))
      .forEach((t) => {
        const i = t.effect,
          r = i?.target;
        if (!(r instanceof HTMLElement)) return;
        const s = "animationName" in t ? String(t.animationName) : "",
          n = r.closest(".lyrics-syllable");
        let a;
        const o = AmLyrics.wipeClocks.get(t),
          l = AmLyrics.normalRiseClocks.get(t);
        if (void 0 !== l) a = e - l;
        else if (void 0 !== o) a = e - o;
        else if (s.includes("wipe") && n)
          a = e - Number(n.dataset.startTime) + Number(i.getTiming().delay);
        else {
          const i = r.classList.contains("char-motion")
            ? r.querySelector(".char")
            : r,
            n = i && AmLyrics.characterAnimations.get(i);
          if (!n || (n.animation !== t && "char-glow" !== s)) return;
          a = e - n.start - ("char-glow" === s ? n.glowEpoch : 0);
        }
        const c = Number(i.getComputedTiming().endTime);
        (this.rewindEffects.push({
          animation: t,
          from: Number(t.currentTime || 0),
          to: Math.min(a, c),
        }),
          t.pause());
      }),
      t.forEach((t) =>
        t
          .querySelectorAll(".lyrics-syllable.finished")
          .forEach((t) => t.classList.remove("finished")),
      ),
      t.forEach((t) =>
        t.querySelectorAll(".shared-word-wipe").forEach((t) => {
          const e = t;
          ((e.style.transition = "none"),
            (e.style.backgroundColor =
              "var(--word-inactive-color, var(--lyplus-text-secondary))"));
        }),
      ));
    const i = performance.now(),
      r = (s) => {
        const n = Math.min(1, (s - i) / 260),
          a = n * n * (3 - 2 * n),
          o = this.currentTime - e;
        for (const { animation: t, from: e, to: i } of this.rewindEffects)
          "idle" !== t.playState && (t.currentTime = e + (i + o - e) * a);
        if (n < 1) this.rewindFrame = requestAnimationFrame(r);
        else {
          this.finishLineRewind();
          for (const e of t)
            (AmLyrics.updateSyllablesForLine(
              e,
              this.currentTime,
              this.shouldReduceMotion,
            ),
              AmLyrics.seekLineWipes(e, this.currentTime));
        }
      };
    this.rewindFrame = requestAnimationFrame(r);
  }
  set currentTime(t) {
    const e = this._currentTime;
    if (e - t > 32 && !this.shouldReduceMotion) {
      const e = this.findActiveLineIndices(t),
        i = this.activeLineIndices
          .filter((t) => e.includes(t))
          .map((t) => this._getLineElement(t))
          .filter((t) => null !== t);
      i.length ? this.startLineRewind(i, t) : this.finishLineRewind();
    } else if (this.rewindingLines.size) {
      const i = this.findActiveLineIndices(t);
      (t - e > 500 ||
        [...this.rewindingLines].some(
          (t) => !i.includes(AmLyrics.getLineIndexFromElement(t) ?? -1),
        )) &&
        this.finishLineRewind();
    }
    ((this._currentTime = t),
      e !== t && this.lyrics && this._onTimeChanged(e, t));
  }
  get currentTime() {
    return this._currentTime;
  }
  ensureTimingCache() {
    this.timingLyrics !== this.lyrics &&
      ((this.timingLyrics = this.lyrics),
        (this.lineHighlightEnds = []),
        (this.activeTimelineInterval = void 0));
  }
  getBackgroundWrap(t) {
    let e = this.backgroundWraps.get(t);
    return (
      void 0 === e &&
      ((e = t.querySelector(".background-vocal-wrap")),
        this.backgroundWraps.set(t, e)),
      e
    );
  }
  _updateFooter() {
    const t = this.shadowRoot?.querySelector(".lyrics-footer");
    if (!t) return;
    const e = t.querySelector(".source-switch-btn"),
      i = t.querySelector(".source-switch-svg"),
      r = t.querySelector(".source-switch-label");
    (e && (e.disabled = this.isFetchingAlternatives),
      i && i.classList.toggle("is-loading", this.isFetchingAlternatives),
      r &&
      (r.textContent = this.isFetchingAlternatives
        ? "Switching..."
        : "Switch"));
  }
  connectedCallback() {
    (super.connectedCallback(),
      (this.motionPreference = window.matchMedia(
        "(prefers-reduced-motion: reduce)",
      )),
      (this.systemReducedMotion = this.motionPreference.matches),
      this.motionPreference.addEventListener(
        "change",
        this.handleMotionPreference,
      ),
      this.fetchLyrics());
  }
  disconnectedCallback() {
    (this.finishLineRewind(),
      this.pendingLayoutOffsets.clear(),
      this.clearGapAnimations(),
      super.disconnectedCallback(),
      this.motionPreference?.removeEventListener(
        "change",
        this.handleMotionPreference,
      ),
      (this.motionPreference = void 0),
      this.cancelLineScrollAnimation(),
      this.lyricsContainer
        ?.querySelectorAll(".native-motion")
        .forEach((t) => AmLyrics.clearCharacterMotion(t)),
      this.lyricsContainer?.querySelectorAll(".lyrics-word").forEach((t) => {
        (AmLyrics.clearNormalWordMotion(t), AmLyrics.clearWordWipe(t));
      }),
      this.userScrollTimeoutId &&
      (clearTimeout(this.userScrollTimeoutId),
        (this.userScrollTimeoutId = void 0)),
      this.clickSeekTimeout &&
      (clearTimeout(this.clickSeekTimeout), (this.clickSeekTimeout = void 0)),
      this.clearBackgroundExpandedLine(),
      this.clearProgressiveBlurLine(),
      this.fetchAbortController?.abort(),
      (this.fetchAbortController = void 0),
      this.lyricsContainer &&
      (this.lyricsContainer.removeEventListener(
        "wheel",
        this._boundHandleUserScroll,
      ),
        this.lyricsContainer.removeEventListener(
          "touchmove",
          this._boundHandleUserScroll,
        )),
      (this.preActiveLineElements = []),
      (this.positionedLineElements = []),
      this.clearGapAnimations(),
      (this.activeGapLineElements = []),
      (this.lastInstrumentalIndex = null),
      this.visibilityObserver?.disconnect(),
      (this.visibilityObserver = void 0));
  }
  async fetchLyrics() {
    this.fetchAbortController?.abort();
    const t = new AbortController();
    ((this.fetchAbortController = t),
      (this.isLoading = !0),
      (this.lyrics = void 0),
      (this.lyricsSource = null),
      (this.availableSources = []),
      (this.currentSourceIndex = 0),
      (this.isFetchingAlternatives = !1),
      (this.hasFetchedAllProviders = !1),
      (this.hasFetchedSpicyLyrics = !1),
      this._updateFooter());
    try {
      if (this.ttml) {
        const t = AmLyrics.parseTTML(this.ttml);
        if (t && t.lines.length > 0)
          return (
            (this.lyrics = t.lines),
            (this.lyricsSource = "Local"),
            t.songwriters && (this.songwriters = t.songwriters),
            (this.availableSources = [
              {
                lines: this.lyrics,
                source: "Local",
                originalTTML: this.ttml,
                songwriters: this.songwriters,
              },
            ]),
            (this.currentSourceIndex = 0),
            (this.hasFetchedAllProviders = !0),
            this._updateFooter(),
            void (await this.onLyricsLoaded())
          );
      }
      const e = await AmLyrics.fetchLyricsFromLrcRed(
        this.songTitle?.trim() || "",
        this.songArtist?.trim() || "",
        this.isrc?.trim(),
        {
          album: this.songAlbum?.trim(),
          durationMs: this.songDurationMs || this.duration,
        },
        this.query?.trim(),
        t.signal,
      );
      if (t.signal.aborted) return;
      if (e && !e.byModel && AmLyrics.hasWordSyncedLyrics(e.lines))
        return (
          (this.availableSources = [e]),
          (this.lyrics = e.lines),
          (this.lyricsSource = e.source),
          e.songwriters && (this.songwriters = e.songwriters),
          this._updateFooter(),
          void (await this.onLyricsLoaded())
        );
      const i = await this.resolveSongMetadata(e?.metadata);
      if (t.signal.aborted) return;
      const r =
        Boolean(this.musicId) &&
        !this.songTitle &&
        !this.songArtist &&
        !this.query &&
        !this.isrc,
        s = e ? [e] : [],
        n = (t) =>
          t.some((t) => !t.byModel && AmLyrics.hasWordSyncedLyrics(t.lines));
      if (i?.metadata && !r) {
        const r = i.metadata.title?.trim() || "",
          n = i.metadata.artist?.trim() || "";
        if (!e?.byModel) {
          const e = await AmLyrics.fetchLyricsFromBiniLyrics(
            r,
            n,
            i.catalogIsrc,
            i.metadata,
          );
          if (t.signal.aborted) return;
          e?.lines.length && s.push(e);
        }
      }
      if (e?.byModel || !n(s)) {
        const r = await this.fetchLyricsFromSpicyLyrics(
          i.spotifyId,
          t.signal,
          e?.isrc || i.catalogIsrc,
          i.metadata,
        );
        if (t.signal.aborted) return;
        r && s.push(r);
      }
      if (i?.metadata && !r) {
        const { title: e, artist: r } = i.metadata;
        if (0 === s.length || !n(s)) {
          const e = await AmLyrics.fetchLyricsFromUnison(i.metadata);
          if ((e && e.lines.length > 0 && s.push(e), t.signal.aborted)) return;
        }
        if (!n(s)) {
          const n = await AmLyrics.fetchLyricsFromYouLyPlus(
            e,
            r,
            i.catalogIsrc,
            i.metadata,
            !0,
          );
          if ((n && n.length > 0 && s.push(...n), t.signal.aborted)) return;
        }
      }
      const a = (t) =>
        t.some(
          (t) =>
            AmLyrics.hasWordSyncedLyrics(t.lines) ||
            (!t.byModel && AmLyrics.getTimingRank(t.lines) < 2),
        );
      if ((0 === s.length || !a(s)) && i?.metadata) {
        const t = await AmLyrics.fetchLyricsFromLrclib(i.metadata);
        t && t.lines.length > 0 && s.push({ lines: t.lines, source: "LRCLIB" });
      }
      if (0 === s.length && i?.metadata) {
        const t = await AmLyrics.fetchLyricsFromGenius(i.metadata);
        t && t.lines.length > 0 && s.push({ lines: t.lines, source: "Genius" });
      }
      if (t.signal.aborted) return;
      if (
        ((this.hasFetchedAllProviders =
          0 === s.length ||
          s.some((t) => "LRCLIB" === t.source || "Genius" === t.source)),
          this._updateFooter(),
          s.length > 0)
      ) {
        ((this.availableSources = AmLyrics.mergeAndSortSources(s)),
          (this.currentSourceIndex = 0));
        const t = this.availableSources[0];
        return (
          (this.lyrics = t.lines),
          (this.lyricsSource = t.source),
          t.songwriters && (this.songwriters = t.songwriters),
          void (await this.onLyricsLoaded())
        );
      }
      ((this.lyrics = void 0),
        (this.lyricsSource = null),
        this.dispatchEvent(
          new CustomEvent("lyrics-error", { bubbles: !0, composed: !0 }),
        ));
    } finally {
      t.signal.aborted || (this.isLoading = !1);
    }
  }
  async onLyricsLoaded() {
    this.dispatchEvent(
      new CustomEvent("lyrics-loaded", {
        detail: { lyrics: this.lyrics, source: this.lyricsSource },
        bubbles: !0,
        composed: !0,
      }),
    );
    ((this.activeLineIndices = []),
      (this.preActiveLineElements = []),
      (this.positionedLineElements = []),
      this.clearGapAnimations(),
      (this.activeGapLineElements = []),
      (this.lastInstrumentalIndex = null),
      this.clearBackgroundExpandedLine(),
      this.lyricsContainer &&
      ((this.isProgrammaticScroll = !0),
        (this.lyricsContainer.scrollTop = 0),
        window.setTimeout(() => {
          this.isProgrammaticScroll = !1;
        }, 100)),
      this.noAutoAlternates || (await this.autoProcessLyrics()));
  }
  async autoProcessLyrics() {
    this.noAutoAlternates ||
      (this.showRomanization && (await this.applyRomanization()),
        this.showTranslation &&
        !this.noAutoAlternates &&
        (await this.applyTranslation()));
  }
  static hasWordSyncedLyrics(t) {
    return t.some(
      (t) =>
        t.text.some(
          (t) => t.text.trim() && (t.timestamp > 0 || t.endtime > 0),
        ) &&
        (t.isWordSynced ??
          (t.text.length > 1 && !t.text.every((t) => t.lineSynced))),
    );
  }
  static getTimingRank(t) {
    return AmLyrics.hasWordSyncedLyrics(t)
      ? 0
      : t.some(
        (t) =>
          t.text.some((t) => t.text.trim()) &&
          (t.timestamp > 0 || t.endtime > 0),
      )
        ? 1
        : 2;
  }
  static getRankForCollected(t) {
    const e = t.trim().toLowerCase();
    return "lrc.red" === e
      ? 0
      : e.startsWith("spicy lyrics")
        ? 2.5
        : e.includes("apple")
          ? 1
          : e.includes("bini")
            ? 2
            : e.includes("unison")
              ? 3
              : e.includes("qq") || e.includes("lyricsplus")
                ? 4
                : e.includes("musixmatch")
                  ? 5
                  : e.includes("lrclib")
                    ? 6
                    : e.includes("genius")
                      ? 8
                      : 7;
  }
  static compareSources(t, e) {
    return (
      AmLyrics.getTimingRank(t.lines) - AmLyrics.getTimingRank(e.lines) ||
      Number(Boolean(t.byModel)) - Number(Boolean(e.byModel)) ||
      AmLyrics.getRankForCollected(t.source) -
      AmLyrics.getRankForCollected(e.source)
    );
  }
  static getDisplaySourceLabel(t) {
    return t.toLowerCase().includes("lyricsplus") ? "QQ" : t;
  }
  static getSourceKey(t) {
    const e = (t || "").trim().toLowerCase();
    return e
      ? e.includes("lyricsplus") || "qq" === e
        ? "qq"
        : e.replace(/\s+/g, " ")
      : "";
  }
  static mergeAndSortSources(t) {
    const e = new Map();
    return (
      t.forEach((t) => {
        if (!t.lines.some((t) => t.text.some((t) => t.text.trim()))) return;
        const i = AmLyrics.getSourceKey(t.source),
          r = e.get(i);
        (!r || AmLyrics.compareSources(t, r) < 0) &&
          e.set(i, { ...t, source: AmLyrics.getDisplaySourceLabel(t.source) });
      }),
      Array.from(e.values()).sort(AmLyrics.compareSources)
    );
  }
  findCurrentSourceIndex(
    t = this.availableSources,
    e = this.lyricsSource,
    i = this.lyrics,
  ) {
    const r = t.findIndex((t) => t.lines === i);
    if (-1 !== r) return r;
    const s = AmLyrics.getSourceKey(e);
    return s ? t.findIndex((t) => AmLyrics.getSourceKey(t.source) === s) : -1;
  }
  static getNextSourceIndex(t, e, i, r) {
    if (t.length <= 1) return -1;
    if (-1 !== e) return (e + 1) % t.length;
    const s = AmLyrics.getSourceKey(i),
      n = t.findIndex(
        (t) => t.lines !== r && AmLyrics.getSourceKey(t.source) !== s,
      );
    return -1 === n ? 0 : n;
  }
  async applySourceAtIndex(t) {
    const e = this.availableSources[t];
    e &&
      ((this.currentSourceIndex = t),
        (this.lyrics = e.lines),
        (this.lyricsSource = e.source),
        e.songwriters && (this.songwriters = e.songwriters),
        await this.onLyricsLoaded());
  }
  async switchSource() {
    if (this.isFetchingAlternatives) return;
    const t = this.fetchAbortController,
      e = this.lyricsSource,
      i = this.lyrics;
    if (!this.hasFetchedAllProviders) {
      ((this.isFetchingAlternatives = !0), this._updateFooter());
      try {
        const r = await this.resolveSongMetadata(
          this.availableSources.find((t) => "lrc.red" === t.source)?.metadata,
        );
        if (t?.signal.aborted) return;
        const s = [];
        if (
          r.metadata &&
          !this.availableSources.some((t) => t.byModel) &&
          !this.availableSources.some((t) => "BiniLyrics" === t.source)
        ) {
          const e = await AmLyrics.fetchLyricsFromBiniLyrics(
            r.metadata.title,
            r.metadata.artist,
            r.catalogIsrc,
            r.metadata,
          );
          if ((e && s.push(e), t?.signal.aborted)) return;
        }
        if (!this.hasFetchedSpicyLyrics) {
          const e = await this.fetchLyricsFromSpicyLyrics(
            r.spotifyId,
            t?.signal,
            this.availableSources.find((t) => "lrc.red" === t.source)?.isrc ||
            r.catalogIsrc,
            r.metadata,
          );
          if (t?.signal.aborted) return;
          e && s.push(e);
        }
        if (r.metadata) {
          if (
            !this.availableSources.some((t) =>
              t.source.toLowerCase().includes("unison"),
            )
          ) {
            const t = await AmLyrics.fetchLyricsFromUnison(r.metadata);
            t && t.lines.length > 0 && s.push(t);
          }
          if (
            !this.availableSources.some(
              (t) =>
                !t.byModel &&
                1 === AmLyrics.getRankForCollected(t.source) &&
                AmLyrics.hasWordSyncedLyrics(t.lines),
            )
          ) {
            const t = r.metadata.title?.trim() || "",
              e = r.metadata.artist?.trim() || "",
              i = await AmLyrics.fetchLyricsFromYouLyPlus(
                t,
                e,
                r.catalogIsrc,
                r.metadata,
                !0,
              );
            i && i.length > 0 && s.push(...i);
          }
          if (
            !this.availableSources.some((t) =>
              t.source.toLowerCase().includes("lrclib"),
            )
          ) {
            const t = await AmLyrics.fetchLyricsFromLrclib(r.metadata);
            t &&
              t.lines.length > 0 &&
              s.push({ lines: t.lines, source: "LRCLIB" });
          }
          if (
            !this.availableSources.some((t) =>
              t.source.toLowerCase().includes("genius"),
            )
          ) {
            const t = await AmLyrics.fetchLyricsFromGenius(r.metadata);
            t &&
              t.lines.length > 0 &&
              s.push({ lines: t.lines, source: "Genius" });
          }
        }
        if (t?.signal.aborted) return;
        s.length > 0 &&
          ((this.availableSources = AmLyrics.mergeAndSortSources([
            ...this.availableSources,
            ...s,
          ])),
            (this.currentSourceIndex = this.findCurrentSourceIndex(
              this.availableSources,
              e,
              i,
            )));
      } finally {
        t?.signal.aborted ||
          ((this.hasFetchedAllProviders = !0),
            (this.isFetchingAlternatives = !1),
            this._updateFooter());
      }
    }
    if (this.availableSources.length > 1) {
      const t = this.findCurrentSourceIndex(this.availableSources, e, i),
        r = AmLyrics.getNextSourceIndex(this.availableSources, t, e, i);
      -1 !== r && (await this.applySourceAtIndex(r));
    }
  }
  async resolveSongMetadata(t) {
    const e = {
      title: this.songTitle?.trim() || t?.title || "",
      artist: this.songArtist?.trim() || t?.artist || "",
      album: this.songAlbum?.trim() || t?.album,
      songwriters: this.songwriters?.trim() || void 0,
      durationMs: t?.durationMs,
    };
    "number" == typeof this.songDurationMs && this.songDurationMs > 0
      ? (e.durationMs = this.songDurationMs)
      : "number" == typeof this.duration &&
      this.duration > 0 &&
      (e.durationMs = this.duration);
    let i = this.musicId,
      r = this.isrc;
    if (this.query && (!e.title || !e.artist || !e.album)) {
      const t = AmLyrics.parseQueryMetadata(this.query);
      t &&
        (!e.title && t.title && (e.title = t.title),
          !e.artist && t.artist && (e.artist = t.artist),
          !e.album && t.album && (e.album = t.album));
    }
    let s = null;
    !this.query ||
      (e.title && e.artist) ||
      ((s = await AmLyrics.searchLyricsPlusCatalog(this.query)),
        s &&
        (!e.title && s.title && (e.title = s.title),
          !e.artist && s.artist && (e.artist = s.artist),
          !e.album && s.album && (e.album = s.album),
          !e.songwriters && s.songwriters && (e.songwriters = s.songwriters),
          null == e.durationMs &&
          "number" == typeof s.durationMs &&
          s.durationMs > 0 &&
          (e.durationMs = s.durationMs),
          !i && s.id?.appleMusic && (i = s.id.appleMusic),
          !r && s.isrc && (r = s.isrc)));
    const n = e.title?.trim() ?? "",
      a = e.artist?.trim() ?? "",
      o = e.album?.trim(),
      l =
        "number" == typeof e.durationMs &&
          Number.isFinite(e.durationMs) &&
          e.durationMs > 0
          ? Math.round(e.durationMs)
          : void 0;
    return {
      metadata:
        n && a
          ? { title: n, artist: a, album: o || void 0, durationMs: l }
          : void 0,
      appleId: i,
      appleSong: null,
      catalogIsrc: r,
      spotifyId: this.spotifyId?.trim() || s?.id?.spotify,
    };
  }
  static async getSpotifyToken() {
    if (AmLyrics.spotifyToken && AmLyrics.spotifyToken.expiresAt > Date.now())
      return AmLyrics.spotifyToken.value;
    if (AmLyrics.spotifyTokenRequest) return AmLyrics.spotifyTokenRequest;
    AmLyrics.spotifyTokenRequest = (async () => {
      const t = Date.now();
      try {
        const e = await fetchWithTimeout(SPOTIFY_TOKEN_URL, { method: "POST" });
        if (!e.ok) return null;
        const i = await e.json(),
          r = 1e3 * i.expires_in;
        return "string" != typeof i.access_token ||
          !i.access_token.trim() ||
          !Number.isFinite(r) ||
          r <= 0
          ? null
          : ((AmLyrics.spotifyToken = {
            value: i.access_token,
            expiresAt: t + r - Math.min(3e4, 0.1 * r),
          }),
            AmLyrics.spotifyToken.value);
      } catch {
        return null;
      }
    })();
    try {
      return await AmLyrics.spotifyTokenRequest;
    } finally {
      AmLyrics.spotifyTokenRequest = void 0;
    }
  }
  async fetchLyricsFromSpicyLyrics(t, e, i, r) {
    this.hasFetchedSpicyLyrics = !0;
    const s = new AbortController(),
      n = () => s.abort();
    if (e?.aborted) return null;
    e?.addEventListener("abort", n, { once: !0 });
    const a = setTimeout(n, 8e3);
    try {
      let e = t;
      if (!e) {
        let t = i ? `isrc:${i}` : "";
        if (
          (!t &&
            r?.title &&
            r.artist &&
            (t = `track:${r.title} artist:${r.artist}`),
            !t)
        )
          return null;
        const n = new URLSearchParams({
          q: t,
          type: "track",
          limit: i ? "1" : "5",
        });
        let a = await AmLyrics.getSpotifyToken();
        if (!a || s.signal.aborted) return null;
        const o = (t) =>
          fetch(`https://api.spotify.com/v1/search?${n}`, {
            signal: s.signal,
            headers: { Authorization: `Bearer ${t}` },
          });
        let l = await o(a);
        if (401 === l.status) {
          if (
            (AmLyrics.spotifyToken?.value === a &&
              (AmLyrics.spotifyToken = void 0),
              (a = await AmLyrics.getSpotifyToken()),
              !a || s.signal.aborted)
          )
            return null;
          l = await o(a);
        }
        if (!l.ok) return null;
        const c = await l.json(),
          d = Array.isArray(c?.tracks?.items) ? c.tracks.items : [],
          h = (t) =>
            t.normalize("NFKC").toLowerCase().replace(/\s+/g, " ").trim(),
          m = i
            ? d.find(
              (t) =>
                !t.external_ids?.isrc ||
                t.external_ids.isrc.toUpperCase() === i.toUpperCase(),
            )
            : d.find(
              (t) =>
                h(t.name || "") === h(r.title) &&
                t.artists?.some((t) => h(t.name || "") === h(r.artist)) &&
                (!r.durationMs ||
                  Math.abs(t.duration_ms - r.durationMs) <= 3e3),
            );
        e = m?.id;
      }
      if (!e || !/^[A-Za-z0-9]{22}$/.test(e)) return null;
      const n = await fetch(
        `https://api.spicylyrics.org/v1/lyrics/${encodeURIComponent(e)}`,
        {
          signal: s.signal,
          headers: { Authorization: `Bearer ${SPICY_LYRICS_CLIENT_KEY}` },
        },
      );
      return n.ok ? parseSpicyLyrics(await n.json()) : null;
    } catch {
      return null;
    } finally {
      (clearTimeout(a), e?.removeEventListener("abort", n));
    }
  }
  static parseQueryMetadata(t) {
    const e = t?.trim();
    if (!e) return null;
    const i = {},
      r = e.split(/\s[-–—]\s/);
    if (r.length >= 2) {
      const [t, ...e] = r,
        s = e.join(" - "),
        n = t.trim(),
        a = s.trim();
      if (n && a) return ((i.title = n), (i.artist = a), i);
    }
    const s = e.split(/\s+[bB]y\s+/);
    if (2 === s.length) {
      const [t, e] = s.map((t) => t.trim());
      if (t && e) return ((i.title = t), (i.artist = e), i);
    }
    return null;
  }
  static async searchLyricsPlusCatalog(t) {
    const e = t?.trim();
    if (!e) return null;
    for (const t of KPOE_SERVERS) {
      const i = `${t.endsWith("/") ? t.slice(0, -1) : t}/v1/songlist/search?q=${encodeURIComponent(e)}`;
      try {
        const t = await fetchWithTimeout(i);
        if (t.ok) {
          const e = await t.json();
          let i = [];
          const r = e;
          if (
            (Array.isArray(r?.results)
              ? (i = r.results)
              : Array.isArray(e) && (i = e),
              i.length > 0)
          ) {
            return i.find((t) => t?.id && t.id.appleMusic) ?? i[0];
          }
        }
      } catch (t) { }
    }
    return null;
  }
  static async fetchLyricsFromLrcRed(t, e, i, r = {}, s = "", n = void 0) {
    if (n?.aborted) return null;
    const a = new AbortController(),
      o = () => a.abort();
    n?.addEventListener("abort", o, { once: !0 });
    const l = setTimeout(() => a.abort(), 3e3);
    try {
      const n = async (t) => {
        try {
          const e = await fetch(
            `https://lrc.red/s/${encodeURIComponent(t)}.song.json`,
            { signal: a.signal },
          );
          if (!e.ok) return null;
          const i = await e.json(),
            r = "string" == typeof i.source ? i.source : void 0,
            s = r ? AmLyrics.parseTTML(r) : null,
            n = s?.lines.length ? s.lines : AmLyrics.parseLrcRedJson(i);
          return n.length
            ? {
              lines: n,
              source: "lrc.red",
              originalTTML: r,
              byModel: !0 === i.byModel,
              isrc: t,
              metadata:
                "string" == typeof i.title && "string" == typeof i.artist
                  ? {
                    title: i.title,
                    artist: i.artist,
                    album: "string" == typeof i.album ? i.album : void 0,
                    durationMs: secondsToMs(i.duration) || void 0,
                  }
                  : void 0,
              songwriters: Array.isArray(i.songwriters)
                ? i.songwriters.join(", ")
                : s?.songwriters,
            }
            : null;
        } catch {
          return null;
        }
      };
      if (i) {
        const t = await n(i);
        if (t) return t;
        if (a.signal.aborted) return null;
      }
      let o;
      if (t && e) {
        const i = new URLSearchParams({ track: t, artist: e });
        (r.album && i.set("album", r.album),
          r.durationMs &&
          Number.isFinite(r.durationMs) &&
          r.durationMs > 0 &&
          i.set("duration", Math.round(r.durationMs / 1e3).toString()),
          (o = `https://lrc.red/match.json?${i.toString()}`));
      } else {
        if (!s) return null;
        o = `https://lrc.red/search.json?${new URLSearchParams({ q: s })}`;
      }
      try {
        const t = await fetch(o, { signal: a.signal });
        if (!t.ok) return null;
        const e = await t.json(),
          i = Array.isArray(e?.hits) ? e.hits[0] : void 0;
        if ("string" == typeof i?.isrc && i.isrc.trim())
          return await n(i.isrc.trim());
      } catch { }
      return null;
    } finally {
      (clearTimeout(l), n?.removeEventListener("abort", o));
    }
  }
  static parseLrcRedJson(t) {
    const e = t?.lyrics?.lines;
    return Array.isArray(e)
      ? e.flatMap((e) => {
        if ("string" != typeof e?.text || !e.text.trim()) return [];
        const i = secondsToMs(e.begin),
          r = secondsToMs(e.end, i),
          s =
            "word" === t.lyrics.sync &&
            Array.isArray(e.words) &&
            e.words.length > 0,
          n = s
            ? e.words.flatMap((t, s) =>
              Array.isArray(t)
                ? t.map((n, a) => {
                  const o = a < t.length - 1,
                    l = !o && s < e.words.length - 1 ? " " : "";
                  return {
                    text: `${n.text || ""}${l}`,
                    part: o,
                    timestamp: secondsToMs(n.begin, i),
                    endtime: secondsToMs(n.end, r),
                  };
                })
                : [],
            )
            : [
              {
                text: e.text,
                part: !1,
                timestamp: i,
                endtime: r,
                lineSynced: !0,
              },
            ];
        return n.length
          ? [
            {
              text: n,
              background: !1,
              backgroundText: [],
              oppositeTurn: "b" === e.voice,
              agentId: e.voice,
              timestamp: i,
              endtime: r,
              isWordSynced: s,
            },
          ]
          : [];
      })
      : [];
  }
  static async fetchLyricsFromBiniLyrics(t, e, i, r = {}) {
    if (!((t && e) || i)) return null;
    try {
      let s = null;
      if (i)
        try {
          const t = `https://lyrics-api.binimum.org/?isrc=${encodeURIComponent(i)}`,
            e = await fetchWithTimeout(t);
          if (e.ok) {
            const t = await e.json();
            t.results && t.results.length > 0 && (s = t);
          }
        } catch { }
      if (!s && t && e) {
        const i = new URLSearchParams({ track: t, artist: e });
        (r.album && i.append("album", r.album),
          r.durationMs &&
          r.durationMs > 0 &&
          i.append("duration", Math.round(r.durationMs / 1e3).toString()));
        const n = `https://lyrics-api.binimum.org/?${i.toString()}`,
          a = await fetchWithTimeout(n);
        a.ok && (s = await a.json());
      }
      if (s && s.results && s.results.length > 0) {
        const t = s.results[0];
        if (t.lyricsUrl) {
          const e = await fetchWithTimeout(t.lyricsUrl);
          if (e.ok) {
            const t = await e.text(),
              i = AmLyrics.parseTTML(t);
            if (i && i.lines.length > 0)
              return {
                lines: i.lines,
                source: "BiniLyrics",
                originalTTML: t,
                songwriters: i.songwriters,
              };
          }
        }
      }
    } catch (t) {
      console.error("Cache API failed", t);
    }
    return null;
  }
  static async fetchLyricsFromYouLyPlus(t, e, i, r = {}, s = !1) {
    if (!((t && e) || i)) return [];
    const n = new URLSearchParams();
    (t && n.append("title", t),
      e && n.append("artist", e),
      i && n.append("isrc", i),
      r.album && n.append("album", r.album),
      r.durationMs &&
      r.durationMs > 0 &&
      n.append("duration", Math.round(r.durationMs / 1e3).toString()),
      DEFAULT_KPOE_SOURCE_ORDER.includes("apple") ||
      n.append("source", DEFAULT_KPOE_SOURCE_ORDER));
    const a = [];
    if (!s) {
      const s = await AmLyrics.fetchLyricsFromBiniLyrics(t, e, i, r);
      if (s && (a.push(s), !s.byModel && AmLyrics.hasWordSyncedLyrics(s.lines)))
        return a;
    }
    const o = [...KPOE_SERVERS].sort(() => Math.random() - 0.5).slice(0, 3);
    for (const t of o) {
      const e = `${t.endsWith("/") ? t.slice(0, -1) : t}/v2/lyrics/get?${n.toString()}`;
      let i = null;
      try {
        const t = await fetchWithTimeout(e);
        t.ok && (i = await t.json());
      } catch {
        i = null;
      }
      if (i) {
        const t = AmLyrics.convertKPoeLyrics(i);
        if (t && t.length > 0) {
          const e =
            i?.metadata?.source ||
            i?.metadata?.provider ||
            "LyricsPlus (KPoe)",
            r = AmLyrics.getRankForCollected(e),
            s = { lines: t, source: e };
          if ((a.push(s), 1 === r && AmLyrics.hasWordSyncedLyrics(t))) break;
        }
      }
    }
    const l = a.some(
      (t) =>
        AmLyrics.getRankForCollected(t.source) <= 2 &&
        !t.byModel &&
        AmLyrics.hasWordSyncedLyrics(t.lines),
    );
    if (!l)
      try {
        const t = `https://lyricsplus.binimum.org/v2/lyrics/get?${new URLSearchParams(n).toString()}`,
          e = await fetchWithTimeout(t);
        if (e.ok) {
          const t = await e.json();
          if (t) {
            const e = AmLyrics.convertKPoeLyrics(t),
              i =
                t?.metadata?.source ||
                t?.metadata?.provider ||
                "LyricsPlus (KPoe)",
              r = e && AmLyrics.hasWordSyncedLyrics(e);
            e && e.length > 0 && r && a.push({ lines: e, source: i });
          }
        }
      } catch (t) { }
    return AmLyrics.mergeAndSortSources(a);
  }
  static parseLrcSubtitles(t) {
    if (!t || "string" != typeof t) return [];
    const e = [],
      i = t.split("\n"),
      r = [];
    for (const t of i) {
      const e = t.match(/^\[(\d{1,3}):(\d{2})\.(\d{2,3})\]\s?(.*)$/);
      if (!e) continue;
      const i = parseInt(e[1], 10),
        s = parseInt(e[2], 10);
      let n = parseInt(e[3], 10);
      3 === e[3].length && (n = Math.round(n / 10));
      const a = 1e3 * (60 * i + s) + 10 * n,
        o = e[4] || "";
      r.push({ timestamp: a, text: o });
    }
    for (let t = 0; t < r.length; t += 1) {
      const { timestamp: i, text: s } = r[t],
        n = t + 1 < r.length ? r[t + 1].timestamp : i + 5e3;
      if (!s.trim()) continue;
      const a = { text: s, part: !1, timestamp: i, endtime: n, lineSynced: !0 };
      e.push({
        text: [a],
        background: !1,
        backgroundText: [],
        oppositeTurn: !1,
        timestamp: i,
        endtime: n,
        isWordSynced: !1,
      });
    }
    return e;
  }
  static async fetchLyricsFromLrclib(t) {
    return null;
  }
  static async fetchLyricsFromGenius(t) {
    return null;
  }
  static async fetchLyricsFromUnison(t) {
    return null;
  }
  static calculateLineAlignments(t, e) {
    const i = new Array(t.length).fill(void 0);
    let r = !0,
      s = null,
      n = 0,
      a = 0;
    if (
      (t.forEach((t, o) => {
        let l;
        if (t) {
          let i = e[t];
          (i ||
            (i = "v1000" === t ? "group" : "v2000" === t ? "other" : "person"),
            "group" === i
              ? (l = "start")
              : (null === s ? (r = "other" !== i) : t !== s && (r = !r),
                (l = r ? "start" : "end"),
                (s = t)));
        }
        (l && ((a += 1), "end" === l && (n += 1)), (i[o] = l));
      }),
        a > 0 && Math.round((n / a) * 100) >= 85)
    ) {
      const t = (t) => ("start" === t ? "end" : "end" === t ? "start" : t);
      for (let e = 0; e < i.length; e += 1) i[e] = t(i[e]);
    }
    return i;
  }
  static parseTTMLTime(t, e = 0) {
    if (!t) return e;
    const i = t.trim().toLowerCase(),
      r = i.match(/^(-?\d+(?:\.\d+)?)(ms|h|m|s)$/);
    if (r) {
      const t = Number(r[1]),
        e = { ms: 1, s: 1e3, m: 6e4, h: 36e5 };
      return Math.max(0, Math.round(t * e[r[2]]));
    }
    const s = i.split(":").map(Number);
    if (s.some((t) => !Number.isFinite(t))) return e;
    let n = 0;
    if (3 === s.length) n = 3600 * s[0] + 60 * s[1] + s[2];
    else if (2 === s.length) n = 60 * s[0] + s[1];
    else {
      if (1 !== s.length) return e;
      [n] = s;
    }
    return Math.max(0, Math.round(1e3 * n));
  }
  static isRightToLeftLanguage(t) {
    if (!t) return !1;
    const e = t.toLowerCase().split(/[-_]/)[0];
    return ["ar", "dv", "fa", "he", "ku", "ps", "ur", "yi"].includes(e);
  }
  static parseTTML(t) {
    try {
      const e = new DOMParser().parseFromString(t, "text/xml"),
        i = {},
        r = {},
        s = {},
        n =
          e.documentElement.getAttribute("xml:lang") ||
          e.documentElement.getAttribute("lang"),
        a = e.getElementsByTagName("ttm:agent");
      for (let t = 0; t < a.length; t += 1) {
        const e = a[t],
          i = e.getAttribute("xml:id"),
          r = e.getAttribute("type");
        i && r && (s[i] = r);
      }
      let o;
      const l = e.getElementsByTagName("songwriter");
      if (l.length > 0) {
        const t = [];
        for (let e = 0; e < l.length; e += 1)
          l[e].textContent && t.push(l[e].textContent);
        t.length > 0 && (o = t.join(", "));
      }
      const c = e.getElementsByTagName("translation");
      for (let t = 0; t < c.length; t += 1) {
        const e = c[t].getElementsByTagName("text");
        for (let t = 0; t < e.length; t += 1) {
          const r = e[t],
            s = r.getAttribute("for");
          s && r.textContent && (i[s] = r.textContent);
        }
      }
      const d = AmLyrics.parseTTMLTime,
        h = e.getElementsByTagName("transliteration");
      for (let t = 0; t < h.length; t += 1) {
        const e = h[t].getElementsByTagName("text");
        for (let t = 0; t < e.length; t += 1) {
          const i = e[t],
            s = i.getAttribute("for");
          if (!s) continue;
          const n = Array.from(i.getElementsByTagName("span")).filter((t) =>
            t.getAttribute("begin"),
          );
          if (n.length > 0) {
            const t = [];
            let e = "";
            for (let i = 0; i < n.length; i += 1) {
              const r = n[i],
                s = r.getAttribute("begin"),
                a = r.getAttribute("end");
              let o = r.textContent || "";
              const l = r.nextSibling;
              (l &&
                3 === l.nodeType &&
                /^\s/.test(l.textContent || "") &&
                !o.endsWith(" ") &&
                (o += " "),
                "" !== o.trim() &&
                (t.push({ time: d(s), duration: d(a) - d(s), text: o }),
                  (e += o)));
            }
            r[s] = { text: e.trim(), syllabus: t };
          } else
            i.textContent &&
              (r[s] = { text: i.textContent.trim().replace(/\s+/g, " ") });
        }
      }
      const m = [],
        p = e.getElementsByTagName("p");
      for (let t = 0; t < p.length; t += 1) {
        const e = p[t],
          s =
            e.getAttributeNS("http://lrc.red/lyric-ttml-internal", "key") ||
            e.getAttribute("itunes:key"),
          a = d(e.getAttribute("begin")),
          o = d(e.getAttribute("end"), a),
          l = e.getAttribute("ttm:agent") || void 0,
          c = e.getAttribute("xml:lang") || e.getAttribute("lang") || n;
        let h;
        e.parentNode &&
          "div" === e.parentNode.tagName &&
          (h =
            e.parentNode.getAttributeNS(
              "http://lrc.red/lyric-ttml-internal",
              "songPart",
            ) ||
            e.parentNode.getAttribute("itunes:songPart") ||
            void 0);
        const u = [],
          y = [],
          g = e.getElementsByTagName("span"),
          f = Array.from(g).some(
            (t) =>
              !(
                "x-bg" === t.getAttribute("ttm:role") ||
                "x-bg" === t.parentNode?.getAttribute?.("ttm:role")
              ) &&
              Boolean(t.getAttribute("begin")) &&
              Boolean(t.getAttribute("end")),
          );
        if (g.length > 0)
          for (let t = 0; t < g.length; t += 1) {
            const e = g[t];
            if ("x-bg" === e.getAttribute("ttm:role")) {
              const t = e.getElementsByTagName("span");
              for (let e = 0; e < t.length; e += 1) {
                const i = t[e];
                let r = i.textContent || "";
                const s = i.nextSibling;
                s &&
                  3 === s.nodeType &&
                  /^\s/.test(s.textContent || "") &&
                  !r.endsWith(" ") &&
                  (r += " ");
                const n = d(i.getAttribute("begin"), a);
                y.push({
                  text: r,
                  timestamp: n,
                  endtime: Math.max(n, d(i.getAttribute("end"), o)),
                  part: !/\s$/.test(r),
                });
              }
              continue;
            }
            if (
              e.parentNode &&
              "x-bg" === e.parentNode.getAttribute?.("ttm:role")
            )
              continue;
            let i = e.textContent || "";
            const r = e.nextSibling;
            r &&
              3 === r.nodeType &&
              /^\s/.test(r.textContent || "") &&
              !i.endsWith(" ") &&
              (i += " ");
            const s = d(e.getAttribute("begin"), a);
            u.push({
              text: i,
              timestamp: s,
              endtime: Math.max(s, d(e.getAttribute("end"), o)),
              part: !/\s$/.test(i),
            });
          }
        if (0 === u.length) {
          const t = Array.from(e.childNodes)
            .filter(
              (t) =>
                !(
                  t instanceof Element && "x-bg" === t.getAttribute("ttm:role")
                ),
            )
            .map((t) => t.textContent || "")
            .join("")
            .trim();
          u.push({
            text: t,
            timestamp: a,
            endtime: o,
            part: !1,
            lineSynced: !0,
          });
        }
        const b = s ? r[s] : void 0;
        if (b && u.length > 1 && g.length > 0)
          if (b.syllabus && b.syllabus.length === u.length)
            u.forEach((t, e) => {
              t.romanizedText = b.syllabus[e].text;
            });
          else {
            const t = b.text.split(/\s+/).filter(Boolean),
              e = [];
            for (let t = 0; t < u.length; t += 1)
              u[t].part && e.length > 0 ? e[e.length - 1].push(t) : e.push([t]);
            const i =
              /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(
                u.map((t) => t.text).join(""),
              );
            if (t.length === e.length)
              e.forEach((e, i) => {
                u[e[0]].romanizedText = t[i];
              });
            else if (t.length === u.length)
              u.forEach((e, i) => {
                e.romanizedText = t[i];
              });
            else if (i) {
              let i = 0;
              for (const r of e) {
                const e = u[r[0]],
                  s = r.map((t) => u[t].text).join(""),
                  n = (
                    s.match(
                      /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7afA-Za-z0-9]/g,
                    ) || []
                  ).length;
                n > 0 &&
                  i < t.length &&
                  ((e.romanizedText = t.slice(i, i + n).join(" ")), (i += n));
              }
            }
          }
        const v = e.getAttribute("begin")
          ? a
          : Math.min(...u.map((t) => t.timestamp)),
          L = Math.max(
            o,
            v,
            ...u.map((t) => t.endtime),
            ...y.map((t) => t.endtime),
          );
        m.push({
          text: u,
          background: y.length > 0,
          backgroundText: y,
          timestamp: v,
          endtime: L,
          isWordSynced: f,
          songPart: h,
          translation: s ? i[s] : void 0,
          romanizedText: b?.text,
          oppositeTurn: !1,
          agentId: l,
          direction:
            "rtl" === e.getAttribute("dir") || AmLyrics.isRightToLeftLanguage(c)
              ? "rtl"
              : void 0,
        });
      }
      const u = m
        .map((t, e) => ({ line: t, sourceIndex: e }))
        .sort(
          (t, e) =>
            t.line.timestamp - e.line.timestamp ||
            t.sourceIndex - e.sourceIndex,
        )
        .map((t) => t.line),
        y = AmLyrics.calculateLineAlignments(
          u.map((t) => t.agentId),
          s,
        );
      return {
        lines: u.map((t, e) => ({
          ...t,
          alignment: y[e],
          oppositeTurn: "end" === y[e],
        })),
        songwriters: o,
      };
    } catch (t) {
      return (console.error("Failed to parse TTML", t), null);
    }
  }
  static convertKPoeLyrics(t) {
    if (!t) return null;
    let e = null;
    if (
      (Array.isArray(t?.lyrics)
        ? (e = t.lyrics)
        : Array.isArray(t?.data?.lyrics)
          ? (e = t.data.lyrics)
          : Array.isArray(t?.data) && (e = t.data),
        !e || 0 === e.length)
    )
      return null;
    const i = e.filter((t) => Boolean(t)),
      r = [],
      s = "Line" === t.type || "line" === t.type,
      n = {};
    t.metadata?.agents &&
      Object.entries(t.metadata.agents).forEach(([t, e]) => {
        const i = e.alias || t;
        n[i] = e.type;
      });
    const a = i.map((t) => t.element?.singer),
      o = AmLyrics.calculateLineAlignments(a, n);
    for (let t = 0; t < i.length; t += 1) {
      const e = i[t],
        n = o[t],
        a = "string" == typeof e.text ? e.text : "",
        l = AmLyrics.toMilliseconds(e.time),
        c = AmLyrics.toMilliseconds(e.duration),
        d = AmLyrics.toMilliseconds(e.endTime) || l + (c || 0);
      let h = [];
      Array.isArray(e.syllabus)
        ? (h = e.syllabus.filter((t) => Boolean(t)))
        : Array.isArray(e.words) && (h = e.words.filter((t) => Boolean(t)));
      const m = [],
        p = [];
      if (!s && h.length > 0)
        for (const t of h) {
          const e = AmLyrics.toMilliseconds(t.time, l),
            i = AmLyrics.toMilliseconds(t.duration),
            r = 0 === i && 1 === h.length ? d : e + i,
            s = {
              text: "string" == typeof t.text ? t.text : "",
              part: Boolean(t.part),
              timestamp: e,
              endtime: r,
            };
          t.isBackground ? p.push(s) : m.push(s);
        }
      0 === m.length &&
        a &&
        m.push({
          text: a,
          part: !1,
          timestamp: l,
          endtime: d || l,
          lineSynced: s,
        });
      const u = !s && h.length > 0 && (m.length > 0 || p.length > 0),
        { transliteration: y } = e;
      let g;
      y &&
        ((g = y.text),
          Array.isArray(y.syllabus) &&
          y.syllabus.length === m.length &&
          y.syllabus.forEach((t, e) => {
            m[e].romanizedText = t.text;
          }));
      const f = e.translation?.text,
        b = {
          text: m,
          background: p.length > 0,
          backgroundText: p,
          oppositeTurn:
            "end" === n ||
            (!!Array.isArray(e.element) &&
              (e.element.includes("opposite") || e.element.includes("right"))),
          timestamp: l,
          endtime: d,
          isWordSynced: !s && u,
          alignment: n,
          songPart: e.element?.songPart,
          romanizedText: g,
          translation: f,
        };
      r.push(b);
    }
    return r;
  }
  static toMilliseconds(t, e = 0) {
    const i = Number(t);
    return !Number.isFinite(i) || Number.isNaN(i)
      ? e
      : Number.isInteger(i)
        ? Math.max(0, Math.round(i))
        : Math.round(1e3 * i);
  }
  firstUpdated() {
    this.lyricsContainer &&
      (this.lyricsContainer.addEventListener(
        "wheel",
        this._boundHandleUserScroll,
        { passive: !0 },
      ),
        this.lyricsContainer.addEventListener(
          "touchmove",
          this._boundHandleUserScroll,
          { passive: !0 },
        ));
  }
  _onTimeChanged(t, e) {
    this.hidePlayedLines && this.updatePlayedLines(e);
    const i = Math.abs(e - t) > 500,
      r = this.findActiveLineIndices(e),
      s = this.activeLineIndices,
      n = !AmLyrics.arraysEqual(r, s);
    if (e < t && (n || i))
      for (const t of this.cachedLineArray)
        for (const i of AmLyrics.motionWords.get(t) || [])
          e < i.start &&
            (i.element.classList.remove("word-started"),
              this.rewindingLines.has(t) ||
              AmLyrics.clearNormalWordMotion(i.element));
    if (n || i) {
      if (this.lyricsContainer) {
        for (const t of s)
          if (!r.includes(t)) {
            const e = this._getLineElement(t);
            if (e) {
              (AmLyrics.unfinishSyllables(e),
                e.classList.remove("active", "scroll-exiting"),
                e.classList.remove("progressive-unblur"),
                e.removeAttribute("aria-current"),
                e.classList.contains("pre-active") &&
                e.classList.remove("pre-active"),
                e.style.removeProperty("filter"));
              const t = this.preActiveLineElements.indexOf(e);
              -1 !== t && this.preActiveLineElements.splice(t, 1);
            }
          }
        for (const t of r)
          if (!s.includes(t) || i) {
            const e = this._getLineElement(t);
            if (e) {
              (s.includes(t) ||
                e
                  .querySelectorAll(".native-motion")
                  .forEach((t) => AmLyrics.clearCharacterMotion(t)),
                e.classList.add("active"),
                e.setAttribute("aria-current", "true"),
                e.classList.remove("pre-active", "scroll-exiting"),
                e.classList.remove("progressive-unblur"),
                e.style.removeProperty("filter"));
              const i = this.preActiveLineElements.indexOf(e);
              -1 !== i && this.preActiveLineElements.splice(i, 1);
            }
          }
        for (const t of this.preActiveLineElements) {
          const e = AmLyrics.getLineIndexFromElement(t);
          (null === e ||
            (!r.includes(e) && t !== this.currentPrimaryActiveLine)) &&
            (t.classList.remove("pre-active"),
              t.classList.remove("progressive-unblur"),
              t.style.removeProperty("filter"));
        }
        this.preActiveLineElements = this.preActiveLineElements.filter((t) =>
          t.classList.contains("pre-active"),
        );
      }
      this.activeLineIndices = r;
    }
    if (
      (this._handleActiveLineScroll(i),
        (n || i) && this.clearPastLineHighlights(),
        this.lyricsContainer)
    ) {
      for (const t of this.activeLineIndices) {
        const r = this._getLineElement(t);
        r?.classList.contains("active") &&
          !this.rewindingLines.has(r) &&
          (AmLyrics.updateSyllablesForLine(r, e, this.shouldReduceMotion),
            i && AmLyrics.seekLineWipes(r, e));
      }
      const t = this.findInstrumentalGapAt(e),
        r = new Set(this.activeGapLineElements);
      if (t) {
        const e = this._getGapElement(t.insertBeforeIndex);
        e && r.add(e);
      }
      for (const t of r) this.updateInstrumentalGap(t, e);
      if (t) {
        if (
          (t.insertBeforeIndex !== this.lastInstrumentalIndex &&
            (this.setBackgroundExpandedLine(null),
              !this.autoScroll ||
              this.isUserScrolling ||
              this.isClickSeeking ||
              this.scrollToInstrumental(t.insertBeforeIndex)),
            (this.lastInstrumentalIndex = t.insertBeforeIndex),
            t.insertBeforeIndex > 0)
        ) {
          const e = this._getLineElement(t.insertBeforeIndex - 1);
          e &&
            e.classList.contains("persist-highlight") &&
            !e.classList.contains("active") &&
            AmLyrics.unfinishSyllables(e);
        }
      } else
        null !== this.lastInstrumentalIndex &&
          (this.lastInstrumentalIndex = null);
      const s =
        this.lyrics && this.lyrics.length > 0
          ? this.lyrics[this.lyrics.length - 1]
          : null,
        n = this.footerElement;
      if (n && s && s.endtime > 0) {
        const t = e > s.endtime + 200;
        if (t && !n.classList.contains("active")) {
          n.classList.add("active");
          const t = this.lyrics
            ? this._getLineElement(this.lyrics.length - 1)
            : null;
          if (t) {
            (t.classList.remove("pre-active"),
              t.classList.remove("progressive-unblur"),
              t.style.removeProperty("filter"));
            const e = this.preActiveLineElements.indexOf(t);
            -1 !== e && this.preActiveLineElements.splice(e, 1);
          }
          !this.autoScroll ||
            this.isUserScrolling ||
            this.isClickSeeking ||
            this.focusLine(n);
        } else
          !t && n.classList.contains("active") && n.classList.remove("active");
      }
    }
  }
  updatePlayedLines(t) {
    this.lyrics &&
      this.lyrics.forEach((e, i) => {
        const r =
          this.hidePlayedLines &&
          this.getLineHighlightEndTime(i) > e.timestamp &&
          t >= this.getLineHighlightEndTime(i);
        this._getLineElement(i)?.classList.toggle("played", r);
      });
  }
  willUpdate(t) {
    (t.has("lyrics") &&
      ((this.cachedLineData = null), this._ensureLineDataCache()),
      this.lyrics &&
      !t.has("lyrics") &&
      (t.has("showRomanization") ||
        t.has("showTranslation") ||
        t.has("fontFamily")) &&
      (this.pendingRenderLayout = this.captureLyricLayout()));
  }
  updated(t) {
    const e =
      t.has("lyrics") ||
      (t.has("isLoading") && !this.isLoading && Boolean(this.lyrics));
    if (
      e &&
      (this._invalidateCaches(),
        this._ensureLineDataCache(),
        this._updateCachedIsUnsynced(),
        this._updateCharTimingData(),
        this.lyricsContainer && this.lyrics)
    ) {
      const t = this.findActiveLineIndices(this.currentTime);
      for (const e of t) {
        const t = this._getLineElement(e);
        t &&
          (t.classList.add("active"), t.setAttribute("aria-current", "true"));
      }
      const e = this.getPrimaryActiveLineIndex(t);
      if (
        (this.setBackgroundExpandedLine(
          null !== e ? this._getLineElement(e) : null,
          !0,
          t,
        ),
          this._onTimeChanged(0, this.currentTime),
          0 === this.positionedLineElements.length)
      ) {
        const t = this.lyricsContainer.querySelector(".lyrics-line");
        t && this.updatePositionClasses(t);
      }
      (this.visibilityObserver?.disconnect(),
        (this.visibilityObserver = new IntersectionObserver(
          (t) => {
            t.forEach((t) => {
              t.target.classList.toggle("far-line", !t.isIntersecting);
            });
          },
          { root: this.lyricsContainer, rootMargin: "200px", threshold: 0 },
        )));
      this.lyricsContainer
        .querySelectorAll(".lyrics-line")
        .forEach((t) => this.visibilityObserver.observe(t));
    }
    if (
      ((e || t.has("hidePlayedLines")) &&
        this.updatePlayedLines(this.currentTime),
        this.pendingRenderLayout && !e)
    ) {
      this._updateCharTimingData();
      for (const t of this.backgroundExpandedLines) {
        const e = t.querySelector(".background-vocal-wrap");
        e &&
          t.style.setProperty(
            "--am-lyrics-background-vocal-height",
            `${e.offsetHeight + 4}px`,
          );
      }
      this.finishLyricLayout(this.pendingRenderLayout);
      for (const t of this.activeLineIndices) {
        const e = this._getLineElement(t);
        e &&
          AmLyrics.updateSyllablesForLine(
            e,
            this.currentTime,
            this.shouldReduceMotion,
          );
      }
    }
    if (
      ((this.pendingRenderLayout = void 0),
        t.has("noBlur") && this.noBlur && this.clearProgressiveBlurLine(),
        t.has("reducedMotion") ||
        t.has("systemReducedMotion") ||
        t.has("lineMotion"))
    ) {
      if (this.shouldReduceMotion) {
        this.finishLineRewind();
        for (const t of this.cachedLineArray) {
          for (const e of AmLyrics.motionWords.get(t) || [])
            AmLyrics.clearNormalWordMotion(e.element);
          t.querySelectorAll(".native-motion").forEach((t) =>
            AmLyrics.clearCharacterMotion(t),
          );
        }
        for (const [t, e] of this.backgroundAnimations)
          (e.cancel(), t.classList.remove("bg-collapsing"));
        this.backgroundAnimations.clear();
        for (const { animation: t } of this.contentSprings.values()) t.cancel();
        this.contentSprings.clear();
      }
      (this.cancelLineScrollAnimation(),
        this.lyricsContainer &&
        this.lyricsContainer.scrollTo({
          top: this.lyricsContainer.scrollTop,
          behavior: "instant",
        }),
        this.lyrics && this._onTimeChanged(this.currentTime, this.currentTime));
    }
    if (t.has("duration") && -1 === this.duration)
      return (
        (this.currentTime = 0),
        (this.activeLineIndices = []),
        (this.preActiveLineElements = []),
        (this.positionedLineElements = []),
        this.clearGapAnimations(),
        (this.activeGapLineElements = []),
        this.clearBackgroundExpandedLine(),
        this.setUserScrolling(!1),
        this.userScrollTimeoutId &&
        (clearTimeout(this.userScrollTimeoutId),
          (this.userScrollTimeoutId = void 0)),
        this.cancelLineScrollAnimation(),
        void (this.lyricsContainer && (this.lyricsContainer.scrollTop = 0))
      );
    ((t.has("query") ||
      t.has("musicId") ||
      t.has("spotifyId") ||
      t.has("isrc") ||
      t.has("ttml") ||
      t.has("songTitle") ||
      t.has("songArtist") ||
      t.has("songAlbum") ||
      t.has("songDurationMs")) &&
      !t.has("currentTime") &&
      this.fetchLyrics(),
      t.has("currentTime") && this.lyrics);
  }
  _handleActiveLineScroll(t = !1) {
    if (!this.lyricsContainer || !this.lyrics || 0 === this.lyrics.length)
      return;
    const e = this.footerElement;
    if (e?.classList.contains("active"))
      return void this.setBackgroundExpandedLine(null);
    let i = 350,
      r = 0,
      s = this.lyrics.length;
    for (; r < s;) {
      const t = Math.floor((r + s) / 2);
      this.lyrics[t].timestamp <= this.currentTime ? (r = t + 1) : (s = t);
    }
    const n = r - 1;
    if (-1 !== n && n + 1 < this.lyrics.length) {
      const t = this.lyrics[n],
        e = this.lyrics[n + 1].timestamp - t.endtime;
      i = Math.min(500, Math.max(350, e));
    }
    const a = n + 1,
      o = a >= 0 && a < this.lyrics.length ? this._getLineElement(a) : null;
    if (
      !o ||
      this.noBlur ||
      this.shouldReduceMotion ||
      this.isUserScrolling ||
      !this.lyricsContainer.classList.contains("blur-inactive-enabled") ||
      this.lyricsContainer.classList.contains("not-focused") ||
      o.classList.contains("active") ||
      o.classList.contains("lyrics-gap")
    )
      this.clearProgressiveBlurLine();
    else {
      if (this.progressiveBlurLine !== o) {
        (this.clearProgressiveBlurLine(),
          (this.progressiveBlurLine = o),
          o.classList.add("progressive-unblur"),
          (o.style.filter = "blur(0em)"));
        const t = o.animate(
          [{ filter: "blur(0.02em)" }, { filter: "blur(0em)" }],
          { duration: 2e3, easing: "linear", fill: "both" },
        );
        ((this.progressiveBlurAnimation = t),
          (t.onfinish = () => {
            this.progressiveBlurAnimation === t && t.cancel();
          }));
      }
      const e = this.currentTime - this.lyrics[a].timestamp + 2e3,
        i = this.progressiveBlurAnimation;
      e < 2e3 &&
        ("idle" === i.playState && i.play(),
          (t ||
            null === i.currentTime ||
            Math.abs(Number(i.currentTime) - e) > 200) &&
          (i.currentTime = e));
    }
    const l = this.currentTime + i,
      c = this.findActiveLineIndices(l);
    let d = null,
      h = null;
    if (
      (c.length > 0 &&
        ((h = this.getPrimaryScrollLineIndex(c, l)),
          null !== h && -1 !== h && (d = this._getLineElement(h))),
        d ||
        ((h = this.getLineIndexAtTime(l, 0)),
          null !== h && -1 !== h && (d = this._getLineElement(h))),
        !d)
    )
      return;
    const m = i;
    ((d !== this.currentPrimaryActiveLine || t) &&
      d.style.setProperty("--scroll-duration", `${m}ms`),
      d.classList.contains("active") ||
      d.classList.contains("pre-active") ||
      (d.classList.add("pre-active"),
        this.preActiveLineElements.includes(d) ||
        this.preActiveLineElements.push(d),
        AmLyrics.updateSyllablesForLine(
          d,
          this.currentTime,
          this.shouldReduceMotion,
        )));
    const p = this.setBackgroundExpandedLine(d, !0, c, l);
    (this.focusLine(d, t || p, m),
      this.pendingLayoutOffsets.size &&
      this.finishLyricLayout(this.captureLyricLayout()));
  }
  _rebuildDomCache() {
    if (((this.backgroundWraps = new WeakMap()), !this.lyricsContainer)) return;
    if (
      (this.lineElementCache.clear(),
        this.gapElementCache.clear(),
        (this.footerElement =
          this.lyricsContainer.querySelector(".lyrics-footer") ?? void 0),
        (this.cachedLineArray = []),
        !this.lyrics)
    )
      return;
    for (let t = 0; t < this.lyrics.length; t += 1) {
      const e = this.lyricsContainer.querySelector(`#lyrics-line-${t}`);
      e &&
        (this.lineElementCache.set(t, e),
          (e._cachedSyllableElements = null),
          AmLyrics.motionWords.delete(e),
          AmLyrics.motionSyllables.delete(e));
      const i = this.lyricsContainer.querySelector(`#gap-${t}`);
      i &&
        ((i._cachedStartTime = parseFloat(
          i.getAttribute("data-start-time") || "0",
        )),
          (i._cachedEndTime = parseFloat(i.getAttribute("data-end-time") || "0")),
          this.gapElementCache.set(t, i));
    }
    (this.lyricsContainer.querySelectorAll(".lyrics-word").forEach((t) => {
      (AmLyrics.clearNormalWordMotion(t),
        AmLyrics.clearWordWipe(t),
        AmLyrics.wordWipes.delete(t));
      const e = t;
      ((e._cachedVirtualWordElements = void 0),
        (e._cachedVirtualWordCharSpans = void 0),
        (e._wordPreWipeKey = void 0));
    }),
      this.lyricsContainer.querySelectorAll(".lyrics-syllable").forEach((t) => {
        (AmLyrics.motionParameters.delete(t),
          AmLyrics.getCachedCharSpans(t).forEach((t) =>
            AmLyrics.clearCharacterMotion(t),
          ));
        const e = t;
        ((e._cachedStartTime = void 0),
          (e._cachedEndTime = void 0),
          (e._cachedVocalTrack = void 0),
          (e._cachedCharSpans = void 0));
      }));
    const t = this.lyricsContainer.querySelectorAll(".lyrics-line");
    this.cachedLineArray = Array.from(t);
  }
  _getLineElement(t) {
    const e = this.lineElementCache.get(t);
    if (e) return e;
    if (!this.lyricsContainer) return null;
    const i = this.lyricsContainer.querySelector(`#lyrics-line-${t}`);
    return (i && this.lineElementCache.set(t, i), i);
  }
  _getGapElement(t) {
    const e = this.gapElementCache.get(t);
    if (e) return e;
    if (!this.lyricsContainer) return null;
    const i = this.lyricsContainer.querySelector(`#gap-${t}`);
    return (i && this.gapElementCache.set(t, i), i);
  }
  clearGapAnimations() {
    (this.gapAnimations.forEach((t, e) => {
      (t.animations.forEach((t) => t.cancel()),
        e.classList.remove("active", "gap-collapsing", "gap-exiting"));
    }),
      this.gapAnimations.clear());
  }
  _invalidateCaches() {
    ((this.timingLyrics = void 0),
      (this.lineHighlightEnds = []),
      (this.activeTimelineInterval = void 0),
      this.finishLineRewind());
    for (const t of this.cachedLineArray)
      for (const e of AmLyrics.motionWords.get(t) || [])
        AmLyrics.clearNormalWordMotion(e.element);
    (this.pendingLayoutOffsets.clear(),
      this.clearGapAnimations(),
      this.cancelLineScrollAnimation(),
      this.lyricsContainer
        ?.querySelectorAll(".native-motion")
        .forEach((t) => AmLyrics.clearCharacterMotion(t)),
      this.clearProgressiveBlurLine(),
      (this.cachedAllGaps = []),
      (this.cachedIsUnsynced = !1),
      (this.cachedLineData = null),
      this.lineElementCache.clear(),
      this.gapElementCache.clear(),
      (this.footerElement = void 0),
      (this.cachedLineArray = []),
      (this.preActiveLineElements = []),
      (this.positionedLineElements = []),
      this.clearGapAnimations(),
      (this.activeGapLineElements = []),
      (this.lastInstrumentalIndex = null),
      this.clearBackgroundExpandedLine(),
      this.visibilityObserver?.disconnect(),
      (this.visibilityObserver = void 0));
  }
  _updateCachedIsUnsynced() {
    this.cachedIsUnsynced =
      !!(this.lyrics && this.lyrics.length > 0) &&
      this.lyrics.every((t) => 0 === t.timestamp && 0 === t.endtime);
  }
  static characterMotionMode(t, e, i = !1) {
    if (/[\u0590-\u08ff]/.test(t)) return "none";
    const r = Array.from(t.trim()).length;
    return r
      ? /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff]/.test(t)
        ? r > 1
          ? "rise"
          : "none"
        : !i && e >= 1e3 && r <= 7
          ? "emphasis"
          : "none"
      : "none";
  }
  _ensureLineDataCache() {
    !this.cachedLineData &&
      this.lyrics &&
      (this.cachedLineData = this.lyrics.map((t) => {
        const e = [];
        let i = [];
        t.text.forEach((r, s) => {
          i.push(r);
          const n = t.text[s + 1];
          (!n || /\s$/.test(r.text) || /^\s/.test(n.text)) &&
            (e.push(i), (i = []));
        });
        const r = AmLyrics.isLineSyncedLine(t),
          s = e.map((t) => {
            const e = t
              .map((t) => t.text)
              .join("")
              .trim(),
              i = Math.min(...t.map((t) => t.timestamp)),
              s = Math.max(...t.map((t) => t.endtime));
            return {
              start: i,
              end: s,
              duration: s - i,
              mode: r ? "none" : AmLyrics.characterMotionMode(e, s - i),
              rtl: /[\u0590-\u08ff]/.test(e),
            };
          });
        return {
          wordGroups: e,
          groupGrowable: s.map((t) => "emphasis" === t.mode),
          groupGlowing: s.map((t) => "emphasis" === t.mode),
          groupCharRise: s.map((t) => "rise" === t.mode),
          groupCharDrag: s.map(() => !1),
          vwFullDuration: s.map((t) => t.duration),
          vwCharOffset: s.map(() => 0),
          vwStartMs: s.map((t) => t.start),
          vwEndMs: s.map((t) => t.end),
          lineIsRTL: "rtl" === t.direction || s.some((t) => t.rtl),
        };
      }));
  }
  _updateCharTimingData() {
    if (!this.shadowRoot) return;
    this._rebuildDomCache();
    const t = Array.from(this.shadowRoot.querySelectorAll(".lyrics-word")),
      e = new Map();
    (t.forEach((t, i) => {
      const r = t.dataset.virtualWordId || `word-${i}`,
        s = e.get(r) || [];
      (s.push(t), e.set(r, s));
    }),
      e.forEach((t) => {
        const e = t.flatMap((t) => Array.from(t.querySelectorAll(".char")));
        t.forEach((i) => {
          const r = i;
          ((r._cachedVirtualWordElements = t),
            (r._cachedVirtualWordCharSpans = e));
        });
        const i = t[0].querySelector(".lyrics-syllable");
        i && AmLyrics.getWordWipe(i);
      }));
  }
  static arraysEqual(t, e) {
    return t.length === e.length && t.every((t, i) => t === e[i]);
  }
  static isLineSyncedLine(t) {
    return !!t && (!1 === t.isWordSynced || t.text.some((t) => t.lineSynced));
  }
  getLineHighlightEndTime(t) {
    if ((this.ensureTimingCache(), void 0 !== this.lineHighlightEnds[t]))
      return this.lineHighlightEnds[t];
    const e = this.computeLineHighlightEndTime(t);
    return ((this.lineHighlightEnds[t] = e), e);
  }
  computeLineHighlightEndTime(t) {
    if (!this.lyrics) return 0;
    const e = this.lyrics[t];
    if (!e) return 0;
    const i = e.backgroundText?.reduce(
      (t, e) => Math.max(t, e.endtime),
      e.timestamp,
    ),
      r = Math.max(e.endtime, i ?? e.timestamp, e.timestamp),
      s = this.lyrics[t + 1];
    if (!s || s.timestamp <= e.timestamp) return r > e.timestamp ? r + 200 : r;
    if (r > e.timestamp) {
      if (s.timestamp < r) return r;
      if (s.timestamp - r >= 7e3) return r;
    }
    return s.timestamp;
  }
  static getLineIndexFromElement(t) {
    if (!t) return null;
    const e = t.id.match(/^lyrics-line-(\d+)$/);
    return e ? parseInt(e[1], 10) : null;
  }
  static easeOutExpo(t) {
    return t <= 0 ? 0 : t >= 1 ? 1 : 1 - 2 ** (-10 * t);
  }
  static getCssTimeMs(t, e, i) {
    const r = getComputedStyle(t).getPropertyValue(e).trim(),
      s = Number.parseFloat(r);
    return Number.isFinite(s) ? (r.endsWith("ms") ? s : 1e3 * s) : i;
  }
  updateInstrumentalGap(t, e) {
    const i =
      t._cachedStartTime ??
      parseFloat(t.getAttribute("data-start-time") || "0"),
      r =
        t._cachedEndTime ?? parseFloat(t.getAttribute("data-end-time") || "0");
    let s = this.gapExitDurationCache.get(t);
    void 0 === s &&
      ((s = AmLyrics.getCssTimeMs(
        t,
        "--am-lyrics-instrumental-exit-duration",
        350,
      )),
        this.gapExitDurationCache.set(t, s));
    let n = this.gapCollapseDurationCache.get(t);
    void 0 === n &&
      ((n = AmLyrics.getCssTimeMs(
        t,
        "--am-lyrics-instrumental-collapse-duration",
        500,
      )),
        this.gapCollapseDurationCache.set(t, n));
    let a = this.gapDotCache.get(t);
    a ||
      ((a = Array.from(t.querySelectorAll(".lyrics-syllable"))),
        this.gapDotCache.set(t, a));
    const o = Math.max(1, r - i),
      l = e - i;
    if (l < 0 || l >= o + 250) {
      const e = t.classList.contains("active")
        ? this.captureLyricLayout()
        : null;
      (this.gapAnimations.get(t)?.animations.forEach((t) => t.cancel()),
        this.gapAnimations.delete(t),
        t.classList.remove("active", "gap-collapsing", "gap-exiting"));
      const i = this.activeGapLineElements.indexOf(t);
      return (
        -1 !== i && this.activeGapLineElements.splice(i, 1),
        void (e && this.finishLyricLayout(e))
      );
    }
    const c = o - l,
      d =
        t.classList.contains("active") !== c > n
          ? this.captureLyricLayout()
          : null;
    (t.classList.toggle("active", c > n),
      t.classList.toggle("gap-collapsing", c <= n),
      t.classList.toggle("gap-exiting", c <= n + s),
      this.activeGapLineElements.includes(t) ||
      this.activeGapLineElements.push(t),
      d && this.finishLyricLayout(d));
    let h = this.gapAnimations.get(t);
    if (h)
      Math.abs(Number(h.animations[0].currentTime) - Math.min(l, h.end)) >
        200 &&
        h.animations.forEach((t) => {
          ((t.currentTime = l),
            "finished" === t.playState &&
            l < Number(t.effect?.getComputedTiming().endTime) &&
            t.play());
        });
    else {
      const e = t.querySelector(".main-vocal-container");
      if (!e) return;
      const i = Math.max(400, o - n - s),
        r = Math.min(o, i + s),
        c = Math.max(0, Math.min(l, i - 400)),
        d = new Set([0, c, c + 160, c + 400, i, r]);
      for (let t = c + 25; t < c + 400; t += 25) d.add(t);
      for (let t = c + 400; t < i; t += Math.max(200, i / 1e3)) d.add(t);
      for (let t = i; t < r; t += 20) d.add(t);
      const m = [...d]
        .filter((t) => t <= r)
        .sort((t, e) => t - e)
        .map((t) => {
          const e = 8e3,
            s = (t + 4e3 - (i % e) + e) % e;
          let n =
            (1.12 +
              (0.85 - 1.12) * ((1 - Math.cos((Math.PI * s) / 4e3)) / 2)) *
            AmLyrics.easeOutExpo(AmLyrics.clamp((t - c) / 400, 0, 1)),
            a = AmLyrics.clamp((t - c) / 160, 0, 1);
          if (t >= i) {
            const e = (t - i) / Math.max(1, r - i),
              s = e <= 0.35,
              o = s ? e / 0.35 : (e - 0.35) / 0.65,
              l = o * o * (3 - 2 * o);
            ((n = s ? 0.85 + 0.35 * l : 1.2 * (1 - l)), (a = s ? 1 : 1 - l));
          }
          return { offset: t / r, transform: `scale(${n})`, opacity: a };
        }),
        p = [
          e.animate(m, { duration: r, fill: "both" }),
          ...a.map((t, e) =>
            t.animate([{ opacity: 0.25 }, { opacity: 1 }], {
              duration: i / 3,
              delay: (e * i) / 3,
              fill: "both",
            }),
          ),
        ];
      (p.forEach((t) => {
        t.currentTime = l;
      }),
        (h = { animations: p, end: r }),
        this.gapAnimations.set(t, h));
    }
  }
  clearProgressiveBlurLine() {
    (this.progressiveBlurAnimation?.cancel(),
      (this.progressiveBlurAnimation = void 0),
      this.progressiveBlurLine &&
      (this.progressiveBlurLine.classList.remove("progressive-unblur"),
        this.progressiveBlurLine.style.removeProperty("filter"),
        (this.progressiveBlurLine = null)));
  }
  captureLyricLayout() {
    const t = this.cachedLineArray.length
      ? this.cachedLineArray
      : Array.from(
        this.lyricsContainer?.querySelectorAll(".lyrics-line") || [],
      ),
      e = Math.max(0, t.indexOf(this.currentPrimaryActiveLine)),
      i = t.slice(Math.max(0, e - 20), e + 21),
      r = i.flatMap((t) =>
        Array.from(t.querySelectorAll(".main-vocal-container")),
      );
    return {
      tops: new Map(i.map((t) => [t, t.offsetTop])),
      contents: new Map(r.map((t) => [t, t.offsetTop])),
      scrollTop: this.lyricsContainer?.scrollTop || 0,
    };
  }
  finishLyricLayout(t, e = !1) {
    if (!this.lyricsContainer) return;
    const i = this.lyricsContainer.scrollTop - t.scrollTop;
    t.tops.forEach((t, e) => {
      const r = t - e.offsetTop + i;
      Math.abs(r) > 0.1 &&
        this.pendingLayoutOffsets.set(
          e,
          (this.pendingLayoutOffsets.get(e) || 0) + r,
        );
    });
    const r = [...t.contents].map(([t, e]) => ({
      content: t,
      delta: e - t.offsetTop,
    }));
    for (const { content: t, delta: e } of r) {
      if (Math.abs(e) < 0.1) continue;
      const i = this.contentSprings.get(t),
        r = i
          ? AmLyrics.sampleSpring(
            i.position,
            i.velocity,
            Number(i.animation.currentTime || 0) / 1e3,
            10,
          )
          : { position: 0, velocity: 0 };
      if (
        (i?.animation.cancel(),
          this.contentSprings.delete(t),
          this.shouldReduceMotion || "instant" === this.lineMotion)
      )
        continue;
      const s = r.position + e,
        n = t.animate(AmLyrics.createLineSpringFrames(s, r.velocity), {
          duration: 1200,
          easing: "linear",
          fill: "both",
        });
      (this.contentSprings.set(t, {
        animation: n,
        position: s,
        velocity: r.velocity,
      }),
        (n.onfinish = () => {
          this.contentSprings.get(t)?.animation === n &&
            (n.cancel(), this.contentSprings.delete(t));
        }));
    }
    if (e || !this.pendingLayoutOffsets.size) return;
    const s = this.currentPrimaryActiveLine,
      n =
        s && this.autoScroll && !this.isUserScrolling
          ? Math.max(0, s.offsetTop - this.getScrollPaddingTop())
          : this.lyricsContainer.scrollTop;
    this.animateScrollYouLy(-n, !1, void 0, s);
  }
  setBackgroundExpandedLine(t, e = !1, i = [], r = this.currentTime) {
    const s = new Set();
    for (const t of i) {
      const e = this._getLineElement(t);
      e &&
        this.getBackgroundWrap(e) &&
        this.lyrics?.[t].backgroundText.some((t) => t.endtime > r) &&
        s.add(e);
    }
    t && this.getBackgroundWrap(t) && s.add(t);
    const n = [...s].filter((t) => !this.backgroundExpandedLines.has(t)),
      a = [...this.backgroundExpandedLines].filter((t) => !s.has(t));
    if (!n.length && !a.length) return !1;
    const o = this.captureLyricLayout(),
      l = [...a, ...n].map((t) => {
        const e = this.getBackgroundWrap(t),
          i = getComputedStyle(e),
          r = { opacity: i.opacity, transform: i.transform },
          n = s.has(t);
        return {
          line: t,
          wrap: e,
          pose: r,
          expanded: n,
          duration: this.shouldReduceMotion
            ? 0
            : AmLyrics.getCssTimeMs(
              t,
              n
                ? "--am-lyrics-background-vocal-enter-duration"
                : "--am-lyrics-background-vocal-exit-duration",
              n ? 650 : 450,
            ),
          height: n ? e.offsetHeight + 4 : 0,
        };
      });
    for (const {
      line: t,
      wrap: e,
      pose: i,
      expanded: r,
      duration: s,
      height: n,
    } of l) {
      (this.backgroundAnimations.get(t)?.cancel(),
        this.backgroundAnimations.delete(t),
        r
          ? (t.style.setProperty(
            "--am-lyrics-background-vocal-height",
            `${n}px`,
          ),
            this.backgroundExpandedLines.add(t))
          : this.backgroundExpandedLines.delete(t),
        t.classList.toggle("bg-expanded", r),
        t.classList.toggle("bg-collapsing", !r && s > 0));
      const a = getComputedStyle(e);
      if (s > 0) {
        const r = e.animate(
          [i, { opacity: a.opacity, transform: a.transform }],
          {
            duration: s,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both",
          },
        );
        (this.backgroundAnimations.set(t, r),
          (r.onfinish = () => {
            this.backgroundAnimations.get(t) === r &&
              (r.cancel(),
                this.backgroundAnimations.delete(t),
                t.classList.remove("bg-collapsing"));
          }));
      }
    }
    return (this.finishLyricLayout(o, e), !0);
  }
  clearBackgroundExpandedLine() {
    for (const t of this.backgroundAnimations.values()) t.cancel();
    for (const t of new Set([
      ...this.backgroundExpandedLines,
      ...this.backgroundAnimations.keys(),
    ]))
      t.classList.remove("bg-expanded", "bg-collapsing");
    (this.backgroundAnimations.clear(), this.backgroundExpandedLines.clear());
    for (const { animation: t } of this.contentSprings.values()) t.cancel();
    this.contentSprings.clear();
  }
  getPrimaryActiveLineIndex(t) {
    if (0 === t.length) return null;
    const e = t[0],
      i = t[t.length - 1];
    let r = Math.max(e, i - 2);
    const s = AmLyrics.getLineIndexFromElement(this.currentPrimaryActiveLine);
    return (
      null !== s && t.includes(s) && (t.length <= 3 || r < s) && (r = s),
      r
    );
  }
  getPrimaryScrollLineIndex(t, e) {
    if (!this.lyrics || 0 === this.lyrics.length) return null;
    const i = t.length
      ? t[t.length - 1]
      : this.getLineIndexAtTime(e, this.lastActiveIndex);
    if (-1 === i) return null;
    const r = AmLyrics.getLineIndexFromElement(this.currentPrimaryActiveLine);
    if (
      null !== r &&
      i > r &&
      this.lyrics[r] &&
      this.lyrics[i] &&
      this.lyrics[r].endtime === this.lyrics[i].endtime
    ) {
      if (this.findActiveLineIndices(e).length <= 3) return r;
    }
    return i;
  }
  focusLine(t, e = !1, i = void 0, r = !1, s = !1) {
    const n = t !== this.currentPrimaryActiveLine;
    if (n && !s) {
      if (
        ((this.lastPrimaryActiveLine = this.currentPrimaryActiveLine),
          this.lastPrimaryActiveLine)
      ) {
        this.lastPrimaryActiveLine.style.setProperty(
          "--scroll-duration",
          `${i ?? 350}ms`,
        );
        const e = AmLyrics.getLineIndexFromElement(this.lastPrimaryActiveLine),
          r = AmLyrics.getLineIndexFromElement(t),
          s =
            null !== e &&
            null !== r &&
            this.getLineHighlightEndTime(e) > (this.lyrics?.[r].timestamp ?? 0);
        (this.lastPrimaryActiveLine.classList.toggle("scroll-exiting", !s),
          this.lastPrimaryActiveLine.classList.contains("active") ||
          (this.lastPrimaryActiveLine.classList.remove("pre-active"),
            (this.preActiveLineElements = this.preActiveLineElements.filter(
              (t) => t !== this.lastPrimaryActiveLine,
            ))));
      }
      ((this.currentPrimaryActiveLine = t),
        this.currentPrimaryActiveLine.classList.remove("scroll-exiting"));
      const e = AmLyrics.getLineIndexFromElement(t);
      null !== e && (this.lastActiveIndex = e);
    }
    const a = AmLyrics.getLineIndexFromElement(t);
    if (!s && null !== a)
      for (const t of this.activeLineIndices)
        if (
          t < a &&
          AmLyrics.isLineSyncedLine(this.lyrics?.[t]) &&
          this.getLineHighlightEndTime(t) <= (this.lyrics?.[a].timestamp ?? 0)
        ) {
          const e = this._getLineElement(t);
          e?.classList.contains("active") &&
            (e.classList.remove("active", "pre-active"),
              e.removeAttribute("aria-current"),
              AmLyrics.unfinishSyllables(e));
        }
    ((n || e) && this.updatePositionClasses(t),
      r ||
      !(e || n || s) ||
      !this.autoScroll ||
      this.isUserScrolling ||
      this.isClickSeeking ||
      this.scrollToActiveLineYouLy(t, e, i));
  }
  setUserScrolling(t) {
    ((this.isUserScrolling = t),
      t
        ? (this.lyricsContainer?.classList.add("user-scrolling"),
          this.clearProgressiveBlurLine())
        : this.lyricsContainer?.classList.remove("user-scrolling"));
  }
  handleUserScroll() {
    this.isProgrammaticScroll ||
      this.isClickSeeking ||
      (this.setUserScrolling(!0),
        this.clearPastLineHighlights(),
        this.userScrollTimeoutId && clearTimeout(this.userScrollTimeoutId),
        (this.userScrollTimeoutId = window.setTimeout(() => {
          if (
            (this.setUserScrolling(!1),
              (this.userScrollTimeoutId = void 0),
              this.activeLineIndices.length > 0)
          )
            this._handleActiveLineScroll(!0);
          else {
            const t = this.findInstrumentalGapAt(this.currentTime);
            t && this.scrollToInstrumental(t.insertBeforeIndex, !0);
          }
        }, 5e3)));
  }
  clearPastLineHighlights() {
    if (!this.lyricsContainer) return;
    const t = this.cachedLineArray.length
      ? this.cachedLineArray
      : Array.from(
        this.lyricsContainer.querySelectorAll(
          ".lyrics-line:not(.lyrics-gap)",
        ),
      );
    for (const e of t)
      !e.classList.contains("active") &&
        e.classList.contains("persist-highlight") &&
        AmLyrics.unfinishSyllables(e);
  }
  getLineIndexAtTime(t, e = 0) {
    if (!this.lyrics || 0 === this.lyrics.length) return -1;
    const i = this.lyrics.length,
      r = Math.max(0, Math.min(e, i - 1));
    for (let e = r; e < i; e += 1) {
      const i = this.lyrics[e];
      if (i.timestamp > t) break;
      if (t >= i.timestamp && t < i.endtime) return e;
    }
    for (let e = r - 1; e >= 0; e -= 1) {
      const i = this.lyrics[e];
      if (t >= i.timestamp && t < i.endtime) return e;
      if (i.endtime < t) break;
    }
    for (let e = 0; e < i; e += 1) {
      const i = this.lyrics[e];
      if (i.timestamp > t) break;
      if (t >= i.timestamp && t < i.endtime) return e;
    }
    return -1;
  }
  findActiveLineIndices(t) {
    if (!this.lyrics || 0 === this.lyrics.length) return [];
    this.ensureTimingCache();
    const e = this.activeTimelineInterval;
    if (e && t >= e.start && t < e.end) return e.indices;
    const i = [];
    let r = -1 / 0,
      s = 1 / 0;
    for (let e = 0; e < this.lyrics.length; e += 1) {
      const n = this.lyrics[e],
        a = this.getLineHighlightEndTime(e);
      if (n.timestamp > t) {
        s = Math.min(s, n.timestamp);
        break;
      }
      ((r = Math.max(r, n.timestamp)),
        t >= n.timestamp && t < a
          ? (i.push(e), (s = Math.min(s, a)))
          : (r = Math.max(r, a)));
    }
    return (
      (this.activeTimelineInterval = { start: r, end: s, indices: i }),
      i
    );
  }
  findInstrumentalGapAt(t) {
    if (!this.lyrics || 0 === this.lyrics.length) return null;
    const e = this.lyrics[0];
    if (t >= 0 && t < e.timestamp) {
      const t = 0,
        i = e.timestamp;
      return i - t >= 7e3
        ? { insertBeforeIndex: 0, gapStart: t, gapEnd: i }
        : null;
    }
    for (let e = 0; e < this.lyrics.length - 1; e += 1) {
      const i = this.lyrics[e],
        r = this.lyrics[e + 1],
        s = i.endtime,
        n = r.timestamp;
      if (t > s && t < n)
        return n - s >= 7e3
          ? { insertBeforeIndex: e + 1, gapStart: s, gapEnd: n }
          : null;
    }
    return null;
  }
  findAllInstrumentalGaps() {
    if (this.cachedAllGaps.length > 0) return this.cachedAllGaps;
    if (!this.lyrics || 0 === this.lyrics.length) return [];
    const t = [],
      e = this.lyrics[0];
    e.timestamp >= 7e3 &&
      t.push({ insertBeforeIndex: 0, gapStart: 0, gapEnd: e.timestamp });
    for (let e = 0; e < this.lyrics.length - 1; e += 1) {
      const i = this.lyrics[e],
        r = this.lyrics[e + 1],
        s = i.endtime,
        n = r.timestamp;
      n - s >= 7e3 &&
        t.push({ insertBeforeIndex: e + 1, gapStart: s, gapEnd: n });
    }
    return ((this.cachedAllGaps = t), t);
  }
  handleLineClick(t) {
    if (this.cachedIsUnsynced) return;
    if (this.lyricsContainer) {
      (this.lyricsContainer.querySelectorAll(".lyrics-line").forEach((t) => {
        (AmLyrics.resetSyllables(t),
          t.classList.remove("scroll-animate", "scroll-exiting"),
          t.style.removeProperty("--scroll-delta"),
          t.style.removeProperty("--lyrics-line-delay"));
      }),
        this.lyricsContainer.classList.remove("wheel-scrolling"));
    }
    (this.cancelLineScrollAnimation(),
      this.userScrollTimeoutId &&
      (clearTimeout(this.userScrollTimeoutId),
        (this.userScrollTimeoutId = void 0)),
      this.setUserScrolling(!1),
      (this.currentPrimaryActiveLine = null),
      (this.lastPrimaryActiveLine = null),
      this.activeLineIds.clear(),
      this.setBackgroundExpandedLine(null));
    const e = this.lyricsContainer?.querySelector(
      `.lyrics-line[data-start-time="${t.text[0]?.timestamp || 0}"]`,
    );
    e &&
      this.lyricsContainer &&
      ((this.currentPrimaryActiveLine = e),
        (this.currentScrollOffset = -this.lyricsContainer.scrollTop),
        (this.isClickSeeking = !0),
        this.clickSeekTimeout && clearTimeout(this.clickSeekTimeout),
        (this.clickSeekTimeout = setTimeout(() => {
          this.isClickSeeking = !1;
        }, 800)),
        this.scrollToActiveLineYouLy(e, !0),
        this.setBackgroundExpandedLine(e));
    const i = new CustomEvent("line-click", {
      detail: { timestamp: t.timestamp },
      bubbles: !0,
      composed: !0,
    });
    this.dispatchEvent(i);
  }
  static getBackgroundTextPlacement(t) {
    if (
      !t.backgroundText ||
      0 === t.backgroundText.length ||
      0 === t.text.length
    )
      return "after";
    const e = t.text[0].timestamp;
    return t.backgroundText[0].timestamp < e ? "before" : "after";
  }
  scrollToActiveLine() {
    if (!this.lyricsContainer || 0 === this.activeLineIndices.length) return;
    const t = Math.min(...this.activeLineIndices),
      e = this.lyricsContainer.querySelector(
        `.lyrics-line:nth-child(${t + 1})`,
      );
    if (e) {
      const t = this.lyricsContainer.clientHeight,
        i = e.offsetTop,
        r = e.clientHeight,
        s = e.querySelector(".background-text.before");
      let n = 0;
      if (s) {
        n = s.clientHeight / 2;
      }
      const a = i - t / 2 + r / 2 - n;
      requestAnimationFrame(() => {
        ((this.isProgrammaticScroll = !0),
          this.lyricsContainer?.scrollTo({ top: a, behavior: "smooth" }),
          setTimeout(() => {
            this.isProgrammaticScroll = !1;
          }, 100));
      });
    }
  }
  scrollToInstrumental(t, e = !1) {
    if (!this.lyricsContainer) return;
    const i = this.lyricsContainer.querySelector(`#gap-${t}`);
    if (i) {
      const t = this.getScrollPaddingTop() - i.offsetTop;
      ((this.isProgrammaticScroll = !0),
        this.clearPastLineHighlights(),
        this.animateScrollYouLy(t, e, void 0, i),
        setTimeout(() => {
          this.isProgrammaticScroll = !1;
        }, 250));
    }
  }
  getScrollPaddingTop() {
    if (!this.lyricsContainer) return 0;
    const t =
      getComputedStyle(this.lyricsContainer).getPropertyValue(
        "--lyrics-scroll-padding-top",
      ) || "12%";
    let e;
    return (
      (e = t.includes("%")
        ? this.lyricsContainer.clientHeight * (parseFloat(t) / 100)
        : parseFloat(t) || 0),
      e
    );
  }
  cancelLineScrollAnimation() {
    (this.lineSprings.forEach((t, e) => {
      (t.animation.cancel(), e.style.removeProperty("will-change"));
    }),
      this.lineSprings.clear());
  }
  static sampleSpring(t, e, i, r, s = 0.9 * r) {
    const n = Math.sqrt(r * r - s * s),
      a = Math.exp(-s * i),
      o = Math.cos(n * i),
      l = Math.sin(n * i);
    return {
      position: a * (t * o + ((e + s * t) / n) * l),
      velocity: a * (e * o - ((s * e + r * r * t) / n) * l),
    };
  }
  static createLineSpringFrames(t, e, i = 10) {
    let r = AmLyrics.lineSpringSamples.get(i);
    return (
      r ||
      ((r = Array.from({ length: 97 }, (t, e) => {
        const r = e / 96,
          s = 1.2 * r;
        return {
          offset: r,
          fromPosition:
            96 === e ? 0 : AmLyrics.sampleSpring(1, 0, s, i).position,
          fromVelocity:
            96 === e ? 0 : AmLyrics.sampleSpring(0, 1, s, i).position,
        };
      })),
        AmLyrics.lineSpringSamples.set(i, r)),
      r.map(({ offset: i, fromPosition: r, fromVelocity: s }) => ({
        offset: i,
        translate: `0 ${t * r + e * s}px`,
      }))
    );
  }
  getLayoutScrollHeight() {
    const t = this.lyricsContainer;
    if (!t) return 0;
    const e = this.footerElement || t.lastElementChild;
    return e
      ? Math.max(
        t.clientHeight,
        e.offsetTop +
        e.offsetHeight +
        (Number.parseFloat(getComputedStyle(e).marginBottom) || 0) +
        (Number.parseFloat(getComputedStyle(t).paddingBottom) || 0),
      )
      : t.scrollHeight;
  }
  animateScrollYouLy(t, e, i, r = null) {
    if (!this.lyricsContainer) return;
    const s = this.lyricsContainer,
      n = s.scrollTop,
      a = -t - n;
    if (this.shouldReduceMotion || "instant" === this.lineMotion)
      return (
        this.cancelLineScrollAnimation(),
        (s.scrollTop = Math.max(0, -t)),
        (this.currentScrollOffset = -s.scrollTop),
        void this.pendingLayoutOffsets.clear()
      );
    if (Math.abs(a) < 0.5 && !this.pendingLayoutOffsets.size) return;
    const o = this.cachedLineArray.length
      ? this.cachedLineArray
      : Array.from(s.querySelectorAll(".lyrics-line")),
      l = o.indexOf(r || this.currentPrimaryActiveLine || o[0]),
      c = this.lineSprings.size > 0,
      d = o.map((t, e) => {
        const i = this.lineSprings.get(t),
          r = i
            ? Math.max(0, Number(i.animation.currentTime || 0) / 1e3 - i.delay)
            : 0,
          s = i
            ? AmLyrics.sampleSpring(i.position, i.velocity, r, i.frequency)
            : { position: 0, velocity: 0 },
          n = a >= 0 ? e - l : l - e;
        let o = 0;
        return (
          "uniform" !== this.lineMotion &&
          (c && i
            ? (o = Math.max(
              0,
              i.delay - Number(i.animation.currentTime || 0) / 1e3,
            ))
            : c || (o = 0.05 * Math.max(0, Math.min(4, n)))),
          {
            line: t,
            index: e,
            top: t.offsetTop,
            height: t.offsetHeight,
            moving: Boolean(i),
            position: s.position + (this.pendingLayoutOffsets.get(t) || 0),
            velocity: s.velocity,
            delay: o,
          }
        );
      });
    (this.pendingLayoutOffsets.clear(), this.cancelLineScrollAnimation());
    const h = AmLyrics.clamp(
      -t,
      0,
      Math.max(0, this.getLayoutScrollHeight() - s.clientHeight),
    ),
      m = h - n,
      p = Math.min(n, h) - 200,
      u = Math.max(n, h) + s.clientHeight + 200;
    ((s.scrollTop = h),
      (this.currentScrollOffset = -h),
      d.forEach(
        ({
          line: t,
          index: e,
          top: i,
          height: r,
          moving: s,
          position: n,
          velocity: a,
          delay: o,
        }) => {
          const c = n + m;
          if (
            Math.abs(e - l) > 20 ||
            (!s && (i + r < p || i > u)) ||
            (Math.abs(c) < 0.1 && Math.abs(a) < 0.1)
          )
            return;
          const d = AmLyrics.createLineSpringFrames(c, a, 10);
          t.style.setProperty("will-change", "translate");
          const h = t.animate(d, {
            duration: 1200,
            delay: 1e3 * o,
            fill: "both",
            easing: "linear",
          });
          (this.lineSprings.set(t, {
            animation: h,
            position: c,
            velocity: a,
            delay: o,
            frequency: 10,
          }),
            (h.onfinish = () => {
              this.lineSprings.get(t)?.animation === h &&
                (h.cancel(),
                  t.style.removeProperty("will-change"),
                  this.lineSprings.delete(t));
            }));
        },
      ));
  }
  updatePositionClasses(t) {
    if (!this.lyricsContainer) return;
    const e = [
      "lyrics-activest",
      "post-active-line",
      "next-active-line",
      "prev-1",
      "prev-2",
      "prev-3",
      "prev-4",
      "next-1",
      "next-2",
      "next-3",
      "next-4",
    ];
    for (const t of this.positionedLineElements) t.classList.remove(...e);
    ((this.positionedLineElements = []),
      t.classList.add("lyrics-activest"),
      this.positionedLineElements.push(t),
      0 === this.cachedLineArray.length &&
      (this.cachedLineArray = Array.from(
        this.lyricsContainer.querySelectorAll(".lyrics-line"),
      )));
    const i = this.cachedLineArray,
      r = i.indexOf(t);
    if (-1 !== r)
      for (
        let t = Math.max(0, r - 4);
        t <= Math.min(i.length - 1, r + 4);
        t += 1
      ) {
        const e = t - r;
        if (0 !== e) {
          const r = i[t];
          (-1 === e
            ? r.classList.add("post-active-line")
            : 1 === e
              ? r.classList.add("next-active-line")
              : e < 0
                ? r.classList.add(`prev-${Math.abs(e)}`)
                : r.classList.add(`next-${e}`),
            this.positionedLineElements.push(r));
        }
      }
  }
  scrollToActiveLineYouLy(t, e = !1, i = void 0) {
    if (!t || !this.lyricsContainer) return;
    const r = this.getScrollPaddingTop(),
      s = Math.max(0, t.offsetTop - r),
      n = -s;
    if (
      !e &&
      !this.pendingLayoutOffsets.size &&
      Math.abs(this.lyricsContainer.scrollTop - s) < 1
    )
      return;
    if (
      !e &&
      !this.pendingLayoutOffsets.size &&
      !t.classList.contains("lyrics-footer")
    ) {
      const t = this.lyricsContainer;
      if (
        t.scrollTop + t.clientHeight >= t.scrollHeight - 50 &&
        s > t.scrollTop - 50
      )
        return;
    }
    (this.lyricsContainer.classList.remove("not-focused", "user-scrolling"),
      (this.isProgrammaticScroll = !0),
      this.setUserScrolling(!1),
      this.userScrollTimeoutId &&
      (clearTimeout(this.userScrollTimeoutId),
        (this.userScrollTimeoutId = void 0)),
      this.clearPastLineHighlights());
    (setTimeout(
      () => {
        this.isProgrammaticScroll = !1;
      },
      (i ?? 350) + 160,
    ),
      this.animateScrollYouLy(n, e, i, t));
  }
  static clamp(t, e, i) {
    return Math.min(i, Math.max(e, t));
  }
  static getVisibleCharacterCount(t) {
    const e = parseFloat(t.getAttribute("data-word-length") || "");
    return Number.isFinite(e) && e > 0
      ? e
      : (t.textContent || "").replace(/\s/g, "").length;
  }
  static getLongWordWipeScale(t) {
    return t <= 6 ? 1 : 1 + 0.35 * AmLyrics.clamp((t - 6) / 10, 0, 1);
  }
  static applyWipeShape(t, e, i = !1) {
    const r = 0.45 * AmLyrics.clamp((e - 6) / 10, 0, 1),
      s = i ? 0.3 : 0.75 + r;
    (t.style.setProperty("--wipe-gradient-width", `${s.toFixed(3)}em`),
      t.style.setProperty("--wipe-gradient-half", `${(s / 2).toFixed(3)}em`));
  }
  static ensureWordWipeGeometry(t, e) {
    if (0 === t.length) return;
    const i = Math.max(1, e || t.length);
    t.forEach((e, r) => {
      if (
        (e.style.getPropertyValue("--word-wipe-width") ||
          e.style.setProperty("--word-wipe-width", `${i}ch`),
          !e.style.getPropertyValue("--char-wipe-position"))
      ) {
        const s = r / Math.max(1, t.length);
        e.style.setProperty(
          "--char-wipe-position",
          -AmLyrics.clamp(s, 0, 1) * i + "ch",
        );
      }
    });
  }
  static clearPreHighlight(t) {
    const e = AmLyrics.getWordElementForSyllable(t);
    e && AmLyrics.clearWordWipe(e);
    const i = t;
    (i.classList.remove("pre-highlight"),
      i.style.removeProperty("--pre-wipe-duration"),
      i.style.removeProperty("--pre-wipe-delay"),
      (i.style.animation = ""),
      i
        .querySelectorAll(".pre-wipe-lead")
        .forEach((t) => AmLyrics.clearPreWipeLead(t)),
      AmLyrics.getCachedVirtualWordElements(
        AmLyrics.getWordElementForSyllable(t),
      ).forEach((t) => {
        t._wordPreWipeKey = void 0;
      }));
  }
  static clearPreWipeLead(t) {
    (t.classList.remove("pre-wipe-lead"),
      t.style.removeProperty("--pre-wipe-duration"),
      t.style.removeProperty("--pre-wipe-delay"));
  }
  static hasTextBoundaryAfter(t) {
    return /\s$/.test(t.textContent || "");
  }
  static getSyllableWordIndex(t) {
    const e = AmLyrics.getWordElementForSyllable(t),
      i = e?.dataset.virtualWordId;
    if (i) return `virtual:${i}`;
    const r = e?.dataset.virtualWordStart,
      s = e?.dataset.virtualWordEnd;
    return r || s
      ? `virtual:${r || ""}:${s || ""}`
      : t.getAttribute("data-word-index") ||
      t.getAttribute("data-syllable-index") ||
      "";
  }
  static getNextWordSyllable(t, e) {
    const i = t[e],
      r = AmLyrics.getSyllableWordIndex(i),
      s = i,
      n = AmLyrics.getVocalTrack(i);
    for (let i = e + 1; i < t.length; i += 1) {
      const e = t[i];
      if (AmLyrics.getVocalTrack(e) !== n) return null;
      if (e.classList.contains("transliteration")) continue;
      return AmLyrics.getSyllableWordIndex(e) === r ||
        (!AmLyrics.hasTextBoundaryAfter(s) && !/^\s/.test(e.textContent || ""))
        ? null
        : e;
    }
    return null;
  }
  static getPreviousNonTransliterationSyllable(t, e) {
    const i = AmLyrics.getVocalTrack(t[e]);
    for (let r = e - 1; r >= 0; r -= 1) {
      const e = t[r];
      if (AmLyrics.getVocalTrack(e) !== i) return null;
      if (!e.classList.contains("transliteration")) return e;
    }
    return null;
  }
  static getVocalTrack(t) {
    const e = t;
    return (
      void 0 === e._cachedVocalTrack &&
      (e._cachedVocalTrack = t.closest(
        ".main-vocal-container, .background-vocal-container",
      )),
      e._cachedVocalTrack
    );
  }
  static getRenderedWordSyllables(t) {
    const e = AmLyrics.getWordElementForSyllable(t);
    return AmLyrics.getCachedVirtualWordElements(e)
      .flatMap((t) => Array.from(t.querySelectorAll(".lyrics-syllable")))
      .filter((t) => !t.classList.contains("transliteration"));
  }
  static getWordWipe(t) {
    if (
      t.classList.contains("line-synced") ||
      t.classList.contains("transliteration")
    )
      return;
    const e = AmLyrics.getCachedVirtualWordElements(
      AmLyrics.getWordElementForSyllable(t),
    ),
      i = e[0];
    if (!i) return;
    const r = AmLyrics.wordWipes.get(i);
    if (r) return r;
    const s = AmLyrics.getRenderedWordSyllables(t),
      n = [],
      a = [];
    let o = 0;
    for (const t of s) {
      const e = AmLyrics.getCachedCharSpans(t),
        i = e.length ? e : [t];
      let r = 0;
      for (const t of i) {
        const e = getComputedStyle(t),
          i = Number.parseFloat(e.width);
        !Number.isFinite(i) ||
          i <= 0 ||
          (n.push({
            element: t,
            width: i,
            offset: o,
            fontSize: Number.parseFloat(e.fontSize),
            padding: Math.max(
              Number.parseFloat(e.paddingLeft) || 0,
              Number.parseFloat(e.paddingRight) || 0,
            ),
          }),
            (o += i),
            (r += i));
      }
      a.push({
        start: Number(t.dataset.startTime),
        end: Number(t.dataset.endTime),
        width: r,
      });
    }
    if (!o || !a.length) return;
    const l = Math.min(...a.map((t) => t.start));
    let c = Math.max(l + 1, ...a.map((t) => t.end));
    const d = e[e.length - 1].nextElementSibling,
      h = Number(d?.dataset.virtualWordStart);
    h > l && (c = Math.min(c, h));
    const m = s
      .map((t) => t.textContent || "")
      .join("")
      .replace(/\s/g, "");
    let p = l;
    const u = i.previousElementSibling,
      y = Number(u?.dataset.virtualWordStart),
      g = Math.min(Number(u?.dataset.virtualWordEnd), l),
      f = u?.querySelectorAll(".lyrics-syllable:not(.transliteration)"),
      b = f?.[f.length - 1];
    y < l &&
      g > y &&
      l - g <= 180 &&
      b &&
      (AmLyrics.hasTextBoundaryAfter(b) ||
        /^\s/.test(s[0].textContent || "")) &&
      (p = Math.max(l - AmLyrics.getWordPreWipeDuration(s[0], s), g - 100));
    const v = {
      syllables: s,
      fragments: n,
      segments: a,
      width: o,
      count: Array.from(m).length,
      cjk: /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/.test(m),
      start: l,
      end: c,
      rtl: t.classList.contains("rtl-text"),
      animations: [],
      epoch: p,
      prepared: !1,
      settled: !1,
    };
    return (e.forEach((t) => AmLyrics.wordWipes.set(t, v)), v);
  }
  static startWordWipe(t, e, i = t.epoch, r = !1) {
    if (t.animations.length) {
      if (r) {
        for (const i of t.animations) {
          if ("idle" !== i.playState) continue;
          const r = i.effect,
            s = r?.target,
            n = t.fragments.find((t) => t.element === s);
          if (s instanceof HTMLElement && n) {
            const e =
              n.fontSize *
              Number.parseFloat(
                s.style.getPropertyValue("--wipe-gradient-width"),
              );
            s.style.backgroundPosition = t.rtl
              ? (n.width + n.padding) / n.fontSize + "em 0%"
              : (-t.width - e - n.padding) / n.fontSize + "em 0%";
          }
          (i.play(),
            (i.currentTime = Math.min(
              e - t.epoch,
              Number(i.effect?.getComputedTiming().endTime),
            )));
        }
        t.settled = !1;
      }
      return;
    }
    if (t.settled && !r) return;
    const s = Math.min(i, t.start),
      n = Math.max(1, t.end - s),
      a = [];
    (s < t.start && a.push({ offset: 0, progress: 0, pre: !0 }),
      a.push({ offset: (t.start - s) / n, progress: 0 }));
    let o = t.start,
      l = 0;
    for (const e of t.segments) {
      const i = AmLyrics.clamp(e.start, o, t.end),
        r = AmLyrics.clamp(e.end, i, t.end);
      (i > o && a.push({ offset: (i - s) / n, progress: l }),
        (l += e.width),
        a.push({ offset: (r - s) / n, progress: l }),
        (o = r));
    }
    a.push({ offset: 1, progress: t.width });
    const c = t;
    ((c.epoch = s),
      (c.prepared = !0),
      (c.settled = !1),
      t.syllables.forEach((t) => {
        t.style.animation = "none";
      }));
    const d = s === t.start;
    for (const {
      element: i,
      width: o,
      offset: l,
      fontSize: h,
      padding: m,
    } of t.fragments) {
      AmLyrics.applyWipeShape(i, t.count, t.cjk);
      const p = t.width / h;
      (i.style.setProperty("--word-wipe-width", `${p}em`),
        (i.style.backgroundColor =
          "var(--word-inactive-color, var(--lyplus-text-secondary))"),
        (i.style.backgroundSize = `calc(${p}em + var(--wipe-gradient-width, 0.75em)) 100%`),
        (i.style.animation = "none"),
        i.classList.add("shared-word-wipe"),
        i.classList.toggle("word-wipe-rtl", t.rtl));
      const u =
        h *
        Number.parseFloat(i.style.getPropertyValue("--wipe-gradient-width")),
        y = l - u - m,
        g = l + o + m,
        f = a.map((e) => {
          let i = e.progress;
          return (
            e.pre ? (i -= u) : d && (i -= u * (1 - e.progress / t.width)),
            { offset: e.offset, edge: i }
          );
        }),
        b = [];
      f.forEach((t, e) => {
        const i = f[e - 1];
        if (i && t.edge > i.edge)
          for (const e of [y, g])
            e > i.edge &&
              e < t.edge &&
              b.push({
                offset:
                  i.offset +
                  ((e - i.edge) / (t.edge - i.edge)) * (t.offset - i.offset),
                edge: e,
              });
        b.push(t);
      });
      const v = b.map((e) => {
        const i = AmLyrics.clamp(e.edge, y, g),
          r = t.rtl ? o + l - i - u : -l - t.width + i;
        return { offset: e.offset, backgroundPosition: r / h + "em 0%" };
      }),
        L = v[v.length - 1].backgroundPosition,
        A = t.rtl ? (o + m) / h + "em 0%" : (-t.width - u - m) / h + "em 0%";
      if (((i.style.backgroundPosition = A), e >= t.end && !r)) {
        i.style.backgroundPosition = L;
        continue;
      }
      let w = 0,
        x = v.length - 1;
      for (; w < x && v[w].backgroundPosition === v[w + 1].backgroundPosition;)
        w += 1;
      for (; x > w && v[x].backgroundPosition === v[x - 1].backgroundPosition;)
        x -= 1;
      if (w === x) {
        i.style.backgroundPosition = L;
        continue;
      }
      const S = v[w].offset,
        k = v[x].offset - S,
        $ =
          k > 0
            ? v
              .slice(w, x + 1)
              .map((t) => ({ ...t, offset: (t.offset - S) / k }))
            : v,
        T = i.animate($, {
          delay: k > 0 ? S * n : 0,
          duration: k > 0 ? k * n : n,
          easing: "linear",
          fill: "forwards",
        }),
        E = Math.min(e - s, k > 0 ? v[x].offset * n : n);
      T.currentTime = E;
      const _ = T.timeline?.currentTime;
      ("number" == typeof _ && (T.startTime = _ - E),
        AmLyrics.wipeClocks.set(T, s),
        t.animations.push(T),
        (T.onfinish = () => {
          c.prepared &&
            c.animations.includes(T) &&
            "finished" === T.playState &&
            ((i.style.backgroundPosition = L),
              T.cancel(),
              (c.settled = c.animations.every((t) => "idle" === t.playState)));
        }));
    }
    t.animations.length || (c.settled = !0);
  }
  static clearWordWipe(t) {
    const e = AmLyrics.wordWipes.get(t);
    e &&
      e.prepared &&
      (e.animations.forEach((t) => t.cancel()),
        (e.animations = []),
        (e.prepared = !1),
        (e.settled = !1),
        e.fragments.forEach(({ element: t }) => {
          (t.classList.remove("shared-word-wipe", "word-wipe-rtl"),
            t.style.removeProperty("background-color"),
            t.style.removeProperty("background-size"),
            t.style.removeProperty("background-position"),
            t.style.removeProperty("animation"));
        }));
  }
  static getWordElementForSyllable(t) {
    return t.parentElement?.parentElement;
  }
  static getWordPreWipeKey(t) {
    const e = AmLyrics.getWordElementForSyllable(t);
    return (
      e?.dataset.virtualWordId ||
      `${t.getAttribute("data-start-time") || ""}:${AmLyrics.getSyllableWordIndex(t)}`
    );
  }
  static isPreWipeArmed(t) {
    const e = AmLyrics.getWordElementForSyllable(t);
    return Boolean(e?._wordPreWipeKey === AmLyrics.getWordPreWipeKey(t));
  }
  static applyWordPreWipe(t, e, i) {
    if (AmLyrics.isPreWipeArmed(t)) return;
    const r = AmLyrics.getWordWipe(t);
    r &&
      (AmLyrics.startWordWipe(r, e, i),
        t.classList.add("pre-highlight"),
        AmLyrics.getCachedVirtualWordElements(
          AmLyrics.getWordElementForSyllable(t),
        ).forEach((e) => {
          e._wordPreWipeKey = AmLyrics.getWordPreWipeKey(t);
        }));
  }
  static getWordPreWipeDuration(t, e = AmLyrics.getRenderedWordSyllables(t)) {
    const i = e.length > 0 ? e : [t],
      r = AmLyrics.getWordElementForSyllable(t),
      s =
        AmLyrics.getCachedVirtualWordCharSpans(r, []).length ||
        i.reduce(
          (t, e) => t + (e.textContent || "").replace(/\s/g, "").length,
          0,
        );
    return s <= 0 ? 0 : AmLyrics.clamp(64 + 9 * s, 80, 240);
  }
  static maybePreWipeNextWord(t, e, i, r) {
    const s = t[e],
      n = AmLyrics.getWordWipe(s),
      a = n?.end ?? r;
    if (
      s.classList.contains("line-synced") ||
      s.classList.contains("transliteration") ||
      s.closest(".lyrics-gap")
    )
      return;
    if (!(s.classList.contains("finished") || i >= a - 100)) return;
    const o = AmLyrics.getNextWordSyllable(t, e);
    if (
      !o ||
      o.classList.contains("line-synced") ||
      o.classList.contains("transliteration") ||
      o.closest(".lyrics-gap") ||
      o.classList.contains("highlight") ||
      o.classList.contains("finished")
    )
      return;
    const l = o._cachedStartTime;
    if (!Number.isFinite(l)) return;
    const c = l - a;
    if (c > 180 || c < 0) return;
    const d = AmLyrics.getRenderedWordSyllables(o),
      h = d.length > 0 ? d : [o],
      m = AmLyrics.getWordPreWipeDuration(o, h);
    if (m <= 0) return;
    const p = Math.max(l - m, a - 100);
    i < p ||
      i >= l ||
      AmLyrics.isPreWipeArmed(o) ||
      AmLyrics.applyWordPreWipe(o, i, p);
  }
  static getCachedCharSpans(t) {
    const e = t;
    return (
      e._cachedCharSpans ||
      (e._cachedCharSpans = Array.from(t.querySelectorAll("span.char"))),
      e._cachedCharSpans
    );
  }
  static getCachedVirtualWordElements(t) {
    if (!t) return [];
    const e = t;
    if (e._cachedVirtualWordElements) return e._cachedVirtualWordElements;
    const { virtualWordId: i } = t.dataset;
    let r = [t];
    return (
      i &&
      t.parentElement &&
      (r = Array.from(
        t.parentElement.querySelectorAll(".lyrics-word"),
      ).filter((t) => t.dataset.virtualWordId === i)),
      r.forEach((t) => {
        t._cachedVirtualWordElements = r;
      }),
      r
    );
  }
  static getCachedVirtualWordCharSpans(t, e) {
    if (!t) return e;
    const i = t;
    if (i._cachedVirtualWordCharSpans) return i._cachedVirtualWordCharSpans;
    const r = AmLyrics.getCachedVirtualWordElements(t),
      s = r.flatMap((t) => Array.from(t.querySelectorAll("span.char"))),
      n = s.length > 0 ? s : e;
    return (
      r.forEach((t) => {
        t._cachedVirtualWordCharSpans = n;
      }),
      n
    );
  }
  static updateSyllableAnimation(t, e = 0) {
    if (t.classList.contains("highlight")) return;
    if (!t.classList.contains("transliteration") && !t.closest(".lyrics-gap")) {
      const i = AmLyrics.getWordWipe(t);
      if (i)
        return (
          AmLyrics.startWordWipe(i, Number(t.dataset.startTime) + e),
          t.classList.remove("pre-highlight"),
          void t.classList.add("highlight")
        );
    }
    const { classList: i } = t,
      r = i.contains("pre-highlight"),
      s = i.contains("rtl-text"),
      n = AmLyrics.getCachedCharSpans(t),
      a = "0" === t.getAttribute("data-syllable-index"),
      o = null !== t.closest(".lyrics-gap"),
      l = parseFloat(t.getAttribute("data-duration") || "0") || 300,
      c = new Map();
    if (n.length > 0) {
      (AmLyrics.applyWipeShape(t, n.length),
        AmLyrics.ensureWordWipeGeometry(n, n.length));
      const i = `char-word-wipe ${l}ms linear ${-e}ms both`;
      n.forEach((t) => {
        (AmLyrics.applyWipeShape(t, n.length), c.set(t, i));
      });
    } else {
      const i = parseFloat(t.getAttribute("data-wipe-ratio") || "1"),
        n = AmLyrics.getVisibleCharacterCount(t),
        c = l * i * AmLyrics.getLongWordWipeScale(n),
        d = Math.min(l, c);
      AmLyrics.applyWipeShape(t, n);
      let h = "wipe";
      if (
        ((h = r
          ? s
            ? "wipe-from-pre-rtl"
            : "wipe-from-pre"
          : a
            ? s
              ? "start-wipe-rtl"
              : "start-wipe"
            : s
              ? "wipe-rtl"
              : "wipe"),
          t.classList.contains("line-synced"))
      )
        return;
      const m = o ? "fade-gap" : h;
      t.style.animation = `${m} ${d}ms ${o ? "ease-out" : "linear"} ${-e}ms forwards`;
    }
    (AmLyrics.getCachedVirtualWordElements(
      AmLyrics.getWordElementForSyllable(t),
    ).forEach((t) => {
      t._wordPreWipeKey = void 0;
    }),
      i.remove("pre-highlight"),
      i.add("highlight"),
      n.forEach((t) => AmLyrics.clearPreWipeLead(t)));
    for (const [t, e] of c.entries())
      (t.style.removeProperty("background-color"), (t.style.animation = e));
  }
  static resetSyllable(t) {
    if (!t) return;
    ((t.style.animation = ""),
      t.style.removeProperty("--pre-wipe-duration"),
      t.style.removeProperty("--pre-wipe-delay"),
      (t.style.transition = "none"),
      (t.style.backgroundColor = t.classList.contains("has-chars")
        ? "transparent"
        : "var(--word-inactive-color, var(--lyplus-text-secondary))"));
    const e = t.querySelectorAll("span.char");
    for (let t = 0; t < e.length; t += 1) {
      const i = e[t];
      ((i.style.animation = ""),
        AmLyrics.clearCharacterMotion(i),
        (i.style.transition = "none"),
        (i.style.backgroundColor =
          "var(--word-inactive-color, var(--lyplus-text-secondary))"),
        AmLyrics.clearPreWipeLead(i));
    }
    t.classList.remove("highlight", "finished", "pre-highlight", "cleanup");
  }
  static resetWordAnimationState(t, e = !1) {
    t.querySelectorAll(".lyrics-word").forEach((t) => {
      (AmLyrics.clearWordWipe(t),
        e || AmLyrics.clearNormalWordMotion(t),
        (e && !t.matches(".growable, .char-rise, .char-drag")) ||
        t.classList.remove("word-started"));
      t._wordPreWipeKey = void 0;
    });
  }
  static resetSyllables(t) {
    if (!t) return;
    (t.classList.remove("persist-highlight"),
      AmLyrics.resetWordAnimationState(t),
      (t._cachedSyllableElements = null));
    const e = t.getElementsByClassName("lyrics-syllable");
    for (let t = 0; t < e.length; t += 1) AmLyrics.resetSyllable(e[t]);
    requestAnimationFrame(() => {
      for (let t = 0; t < e.length; t += 1) {
        const i = e[t];
        (i.classList.contains("shared-word-wipe") ||
          i.style.removeProperty("background-color"),
          i.style.removeProperty("transition"));
        const r = i.querySelectorAll("span.char");
        for (let t = 0; t < r.length; t += 1) {
          const e = r[t];
          (e.classList.contains("shared-word-wipe") ||
            e.style.removeProperty("background-color"),
            e.style.removeProperty("transition"),
            e.style.removeProperty("will-change"));
        }
      }
    });
  }
  static unfinishSyllables(t) {
    if (!t) return;
    (t.classList.remove("persist-highlight"),
      AmLyrics.resetWordAnimationState(t, !0));
    const e = t.getElementsByClassName("lyrics-syllable");
    for (let t = 0; t < e.length; t += 1) {
      const i = e[t];
      (i.classList.remove("highlight", "finished", "pre-highlight", "cleanup"),
        (i.style.animation = ""),
        i.style.removeProperty("--pre-wipe-duration"),
        i.style.removeProperty("--pre-wipe-delay"),
        i.style.removeProperty("background-color"),
        i.style.removeProperty("transition"));
      const r = i.querySelectorAll("span.char");
      for (let t = 0; t < r.length; t += 1) {
        const e = r[t];
        ((e.style.animation = ""),
          e.removeAttribute("data-glow"),
          e.style.removeProperty("will-change"),
          e.style.removeProperty("background-color"),
          e.style.removeProperty("transition"),
          e.style.removeProperty("filter"),
          AmLyrics.clearPreWipeLead(e));
      }
    }
  }
  static clearNormalWordMotion(t) {
    const e = AmLyrics.normalWordMotions.get(t);
    e &&
      (e.animations.forEach((t) => t.cancel()),
        AmLyrics.normalWordMotions.delete(t),
        t.classList.remove("normal-word-motion"));
  }
  static startNormalWordMotion(t, e) {
    const i = t;
    (AmLyrics.normalWordFrames ||
      (AmLyrics.normalWordFrames = Array.from({ length: 65 }, (t, e) => ({
        offset: e / 64,
        transform: `translate3d(0, calc(var(--char-rise-y) * ${64 === e ? 1 : 1 - AmLyrics.sampleSpring(1, 0, (2 * e) / 64, Math.sqrt(14), 3.5).position} * var(--am-lyrics-lift)), 0)`,
      }))),
      (i.settled = !1),
      (i.animations = i.targets.map((t) => {
        const r = t.animate(AmLyrics.normalWordFrames, {
          duration: 2e3,
          easing: "linear",
          fill: "both",
        });
        return (
          (r.currentTime = e),
          AmLyrics.normalRiseClocks.set(r, i.start),
          r
        );
      })));
    const r = i.animations[i.animations.length - 1];
    r.onfinish = () => {
      i.animations[i.animations.length - 1] === r &&
        (i.animations.forEach((t) => t.cancel()),
          (i.animations = []),
          (i.settled = !0));
    };
  }
  static updateNormalWordMotion(t, e, i) {
    const r = i - e;
    if (r < 0) return void AmLyrics.clearNormalWordMotion(t);
    let s = AmLyrics.normalWordMotions.get(t);
    if (!s) {
      const i = t.classList.contains("allow-break")
        ? Array.from(
          t.querySelectorAll(".lyrics-syllable.no-chars:not(.line-synced)"),
        )
        : [t];
      if (!i.length) return;
      ((s = { targets: i, animations: [], start: e, settled: !1 }),
        AmLyrics.normalWordMotions.set(t, s),
        t.classList.add("normal-word-motion"));
    }
    if (!(s.settled && r >= 1800)) {
      if (r >= 2e3)
        return (
          s.animations.forEach((t) => t.cancel()),
          (s.animations = []),
          void (s.settled = !0)
        );
      if (s.animations.length)
        for (const t of s.animations)
          Math.abs(Number(t.currentTime) - r) > 200 &&
            ((t.currentTime = r), "finished" === t.playState && t.play());
      else AmLyrics.startNormalWordMotion(s, r);
    }
  }
  static clearCharacterMotion(t) {
    const e = AmLyrics.characterAnimations.get(t);
    if (e) {
      if ((e.animation.cancel(), e.settled)) {
        (t.parentElement?.classList.contains("char-motion")
          ? t.parentElement
          : t
        ).style.removeProperty("transform");
      }
      (AmLyrics.characterAnimations.delete(t),
        t.classList.remove("native-motion"),
        t.removeAttribute("data-glow"));
    }
  }
  static resumeCharacterMotion(t, e) {
    const i = AmLyrics.characterAnimations.get(t);
    if (!i?.settled) return;
    ((t.parentElement?.classList.contains("char-motion")
      ? t.parentElement
      : t
    ).style.removeProperty("transform"),
      (i.settled = !1),
      i.animation.play(),
      (i.animation.currentTime = e),
      Number(t.style.getPropertyValue("--char-glow-max")) > 0 &&
      (t.style.setProperty(
        "--char-glow-delay",
        Number(i.animation.effect?.getTiming().delay) - e + "ms",
      ),
        t.setAttribute("data-glow", ""),
        (i.glowEpoch = e)));
  }
  static updateCharacterMotion(t, e) {
    let i = AmLyrics.motionSyllables.get(t);
    if (!i) {
      const e = new Set();
      ((i = Array.from(t.querySelectorAll(".lyrics-syllable.has-chars")).filter(
        (t) => {
          const i = AmLyrics.getWordElementForSyllable(t),
            r = i?.classList.contains("char-rise")
              ? t
              : AmLyrics.getCachedVirtualWordElements(i)[0] || t;
          return !e.has(r) && (e.add(r), !0);
        },
      )),
        AmLyrics.motionSyllables.set(t, i));
    }
    i.forEach((t) => {
      let i = AmLyrics.motionParameters.get(t);
      if (!i) {
        const e = AmLyrics.getWordElementForSyllable(t),
          r = e?.classList.contains("char-rise") ?? !1,
          s = AmLyrics.getCachedCharSpans(t),
          n = r ? s : AmLyrics.getCachedVirtualWordCharSpans(e, s),
          a = Number(
            r
              ? t.dataset.startTime
              : (e?.dataset.virtualWordStart ?? t.dataset.startTime),
          ),
          o = Number(
            r
              ? t.dataset.endTime
              : (e?.dataset.virtualWordEnd ?? t.dataset.endTime),
          );
        ((i = {
          chars: n,
          duration: Math.max(0.001, (o - a) / 1e3),
          start: a,
          cjk: r,
        }),
          AmLyrics.motionParameters.set(t, i));
      }
      const { chars: r, duration: s, start: n, cjk: a } = i,
        o = r.length;
      if (!o) return;
      const l = e - n,
        c = ((1e3 * s) / o) * (a ? 0.4 : 0.35),
        d = a ? Math.min(c, 50, 200 / o) : Math.min(c, 350),
        h = (2 * s) / o,
        m = Math.min(3, s),
        p = a ? 0 : AmLyrics.clamp(s - 1, 0, 1),
        u = a ? 0 : 0.45 * AmLyrics.clamp((s - 1) / 0.5, 0, 1),
        y = Math.max(h + 2 * m, a ? 3 : 0);
      r.forEach((t, e) => {
        const r = (e + 1) * d;
        if (l < 0) return void AmLyrics.clearCharacterMotion(t);
        const c = 1e3 * y + r,
          g = i;
        let f = AmLyrics.characterAnimations.get(t);
        if (f && f.key === g) {
          if (f.settled)
            l < f.end - 200 && AmLyrics.resumeCharacterMotion(t, l);
          else if (
            Math.abs(Number(f.animation.currentTime) - Math.min(l, f.end)) > 200
          ) {
            if (((f.animation.currentTime = Math.min(l, f.end)), u))
              for (const e of t.getAnimations())
                "animationName" in e &&
                  "char-glow" === e.animationName &&
                  ((e.currentTime = l - f.glowEpoch), l < f.end && e.play());
            l < f.end &&
              "finished" === f.animation.playState &&
              f.animation.play();
          }
        } else {
          AmLyrics.clearCharacterMotion(t);
          const i = `${s}:${o}:${p ? e : 0}:${a}`;
          let d = AmLyrics.characterFrames.get(i);
          (d ||
            ((d = Array.from({ length: 61 }, (t, i) => {
              const r = (y * i) / 60,
                s = 60 === i;
              let n = a
                ? 1 -
                AmLyrics.sampleSpring(1, 0, r, Math.sqrt(14), 3.5).position
                : AmLyrics.springProgress(r, m);
              s && (n = 1);
              const l = s
                ? 0
                : AmLyrics.springProgress(r, m) *
                (1 - AmLyrics.springProgress(r - h, m));
              return {
                offset: i / 60,
                transform: `translate(calc(${0.5 * (e - (o - 1) / 2) * 0.1 * p * l}em * var(--am-lyrics-lift)), calc((var(--char-rise-y) * ${n} - ${2.5 * p * l}px) * var(--am-lyrics-lift))) scale(${1 + 0.1 * p * l})`,
              };
            })),
              AmLyrics.characterFrames.size >= 64 &&
              AmLyrics.characterFrames.delete(
                AmLyrics.characterFrames.keys().next().value,
              ),
              AmLyrics.characterFrames.set(i, d)),
            u &&
            (t.setAttribute("data-glyph", t.textContent || ""),
              t.setAttribute("data-glow", ""),
              t.style.setProperty("--char-glow-max", `${u}`),
              t.style.setProperty("--char-glow-duration", 1e3 * y + "ms"),
              t.style.setProperty("--char-glow-delay", r - l + "ms")),
            t.classList.add("native-motion"));
          const b = t.parentElement?.classList.contains("char-motion")
            ? t.parentElement
            : t,
            v = b.animate(d, {
              duration: 1e3 * y,
              delay: r,
              fill: "forwards",
              easing: "linear",
            }),
            L = v.timeline?.currentTime;
          ("number" == typeof L
            ? (v.startTime = L - Math.min(l, c))
            : (v.currentTime = Math.min(l, c)),
            (f = {
              animation: v,
              start: n,
              end: c,
              key: g,
              glowEpoch: l,
              settled: !1,
              finalTransform: d[d.length - 1].transform,
            }),
            AmLyrics.characterAnimations.set(t, f));
          const A = f;
          v.onfinish = () => {
            AmLyrics.characterAnimations.get(t) === A &&
              "finished" === v.playState &&
              ((b.style.transform = A.finalTransform),
                (A.settled = !0),
                t.removeAttribute("data-glow"),
                v.cancel());
          };
        }
      });
    });
  }
  static springProgress(t, e) {
    if (t <= 0) return 0;
    const i = (2 * Math.PI * t) / Math.max(0.001, e);
    return 1 - (1 + i) * Math.exp(-i);
  }
  static seekLineWipes(t, e) {
    for (const i of AmLyrics.motionWords.get(t) || [])
      i.wipe &&
        e < i.wipe.end &&
        (i.wipe.settled ||
          i.wipe.animations.some((t) => "idle" === t.playState)) &&
        AmLyrics.startWordWipe(i.wipe, e, i.wipe.epoch, !0);
    t.getAnimations({ subtree: !0 }).forEach((t) => {
      const i = AmLyrics.wipeClocks.get(t);
      if (void 0 !== i) {
        const r = t,
          s = Number(t.effect?.getComputedTiming().endTime),
          n = e - i;
        return (
          (r.currentTime = Math.min(n, s)),
          void (
            n < s &&
            "running" !== t.playState &&
            (t.play(), (r.currentTime = n))
          )
        );
      }
      if (!("animationName" in t) || !String(t.animationName).includes("wipe"))
        return;
      const r = t.effect,
        s = r.target?.closest(".lyrics-syllable");
      if (!s) return;
      const n = e - Number(s.dataset.startTime) + Number(r.getTiming().delay),
        a = Number(r.getComputedTiming().endTime),
        o = t;
      ((o.currentTime = Math.min(n, a)),
        n < a && "running" !== t.playState && (t.play(), (o.currentTime = n)));
    });
  }
  static updateSyllablesForLine(t, e, i = !1) {
    let r = AmLyrics.motionWords.get(t);
    (r ||
      ((r = Array.from(
        t.querySelectorAll(".lyrics-word[data-virtual-word-start]"),
      ).map((t) => {
        const e = t.querySelector(".lyrics-syllable");
        return {
          element: t,
          start: Number(t.dataset.virtualWordStart),
          wipe: e ? AmLyrics.getWordWipe(e) : void 0,
          normal: Boolean(
            e &&
            !e.matches(".has-chars, .line-synced") &&
            !t.matches(".growable, .char-rise, .char-drag"),
          ),
        };
      })),
        AmLyrics.motionWords.set(t, r)),
      r.forEach(({ element: t, start: r, wipe: s, normal: n }) => {
        const a = e >= r;
        (t.classList.contains("word-started") !== a &&
          t.classList.toggle("word-started", a),
          n && !i && AmLyrics.updateNormalWordMotion(t, r, e),
          s && e >= s.epoch - 500 && AmLyrics.startWordWipe(s, e));
      }),
      i || AmLyrics.updateCharacterMotion(t, e));
    let s = t._cachedSyllableElements;
    if (!s) {
      s = Array.from(t.querySelectorAll(".lyrics-syllable"));
      for (let t = 0; t < s.length; t += 1) {
        const e = s[t];
        ((e._cachedStartTime = parseFloat(
          e.getAttribute("data-start-time") || "0",
        )),
          (e._cachedEndTime = parseFloat(
            e.getAttribute("data-end-time") || "0",
          )));
      }
      t._cachedSyllableElements = s;
    }
    for (let t = 0; t < s.length; t += 1) {
      const i = s[t],
        r = i._cachedStartTime,
        n = i._cachedEndTime;
      if (Number.isFinite(r) && Number.isFinite(n)) {
        const { classList: a } = i,
          o = a.contains("highlight"),
          l = a.contains("finished"),
          c = a.contains("pre-highlight");
        if (!(e < r - 1e3) || o || l || c) {
          let d = !1;
          if (c && e < r) {
            const r = AmLyrics.getPreviousNonTransliterationSyllable(s, t),
              n =
                r?.classList.contains("highlight") ||
                r?.classList.contains("finished"),
              a = AmLyrics.getWordWipe(i);
            (!n || (a && e < a.epoch)) &&
              (AmLyrics.clearPreHighlight(i), (d = !0));
          }
          if (!d) {
            if (e >= r && e <= n)
              (o || AmLyrics.updateSyllableAnimation(i, e - r),
                l && a.remove("finished"));
            else if (e > n)
              l ||
                (o || AmLyrics.updateSyllableAnimation(i, e - r),
                  a.add("finished"));
            else if (o || l) {
              const t = AmLyrics.getWordWipe(i);
              if (t && e >= t.start)
                a.remove("highlight", "finished", "cleanup");
              else {
                const t = AmLyrics.getWordElementForSyllable(i);
                (t && AmLyrics.clearWordWipe(t), AmLyrics.resetSyllable(i));
              }
            }
            AmLyrics.maybePreWipeNextWord(s, t, e, n);
          }
        }
      }
    }
  }
  generateLRC() {
    if (!this.lyrics) return "";
    let t = "";
    (this.songTitle && (t += `[ti:${this.songTitle}]\n`),
      this.songArtist && (t += `[ar:${this.songArtist}]\n`),
      this.songAlbum && (t += `[al:${this.songAlbum}]\n`),
      this.lyricsSource && (t += `[re:${this.lyricsSource}]\n`));
    for (const e of this.lyrics)
      if (e.text && e.text.length > 0) {
        const i = AmLyrics.formatTimestampLRC(e.timestamp),
          r = e.text
            .map((t) => t.text)
            .join("")
            .trim();
        t += `[${i}]${r}\n`;
      }
    return t;
  }
  generatePlain() {
    return this.lyrics
      ? this.lyrics
        .flatMap((t) => {
          const e = t.text
            .map((t) => t.text)
            .join("")
            .trim(),
            i = (t.backgroundText || [])
              .map((t) => t.text)
              .join("")
              .trim(),
            r = i
              ? i.startsWith("(") && i.endsWith(")")
                ? i
                : `(${i})`
              : "";
          return (
            "before" === AmLyrics.getBackgroundTextPlacement(t)
              ? [r, e]
              : [e, r]
          ).filter(Boolean);
        })
        .join("\n")
      : "";
  }
  generateTTML() {
    if (!this.lyrics) return "";
    let t,
      e = '<?xml version="1.0" encoding="UTF-8"?>\n';
    ((e +=
      '<tt xmlns="http://www.w3.org/ns/ttml" xmlns:itunes="http://music.apple.com/lyrics">\n'),
      (e += "  <body>\n"));
    for (let i = 0; i < this.lyrics.length; i += 1) {
      const r = this.lyrics[i],
        s = r.songPart;
      (s === t && 0 !== i) ||
        (i > 0 && (e += "    </div>\n"),
          (t = s),
          (e += t ? `    <div itunes:song-part="${t}">\n` : "    <div>\n"));
      e += `      <p begin="${AmLyrics.formatTimestampTTML(r.timestamp)}" end="${AmLyrics.formatTimestampTTML(r.endtime)}">\n`;
      for (const t of r.text) {
        e += `        <span begin="${AmLyrics.formatTimestampTTML(t.timestamp)}" end="${AmLyrics.formatTimestampTTML(t.endtime)}">${t.text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")}</span>\n`;
      }
      e += "      </p>\n";
    }
    return (
      this.lyrics.length > 0 && (e += "    </div>\n"),
      (e += "  </body>\n"),
      (e += "</tt>"),
      e
    );
  }
  static formatTimestampLRC(t) {
    const e = t / 1e3,
      i = Math.floor(e / 60),
      r = Math.floor(e % 60),
      s = Math.floor((t % 1e3) / 10),
      n = (t) => t.toString().padStart(2, "0");
    return `${n(i)}:${n(r)}.${n(s)}`;
  }
  static formatTimestampTTML(t) {
    const e = t / 1e3,
      i = Math.floor(e / 3600),
      r = Math.floor((e % 3600) / 60),
      s = Math.floor(e % 60),
      n = Math.floor(t % 1e3),
      a = (t, e = 2) => t.toString().padStart(e, "0");
    return `${a(i)}:${a(r)}:${a(s)}.${a(n, 3)}`;
  }
  downloadLyrics() {
    if (!this.lyrics || 0 === this.lyrics.length) return;
    const t = this.lyrics.some((t) => !1 !== t.isWordSynced);
    let e = "",
      i = this.downloadFormat;
    "auto" === i && (i = t ? "ttml" : "lrc");
    let r = "";
    if ("ttml" === i) {
      const t = this.availableSources[this.currentSourceIndex];
      ((e =
        (t?.source === this.lyricsSource && t.originalTTML) ||
        this.generateTTML()),
        (r = "application/xml"));
    } else
      "plain" === i
        ? ((e = this.generatePlain()),
          (i = "txt"),
          (r = "text/plain;charset=utf-8"))
        : ((e = this.generateLRC()), (r = "text/plain"));
    if (!e) return;
    const s = new Blob([e], { type: r }),
      n = URL.createObjectURL(s),
      a = document.createElement("a");
    a.href = n;
    const o = this.songTitle
      ? `${this.songTitle}${this.songArtist ? ` - ${this.songArtist}` : ""}.${i}`
      : `lyrics.${i}`;
    ((a.download = o),
      document.body.appendChild(a),
      a.click(),
      document.body.removeChild(a),
      URL.revokeObjectURL(n));
  }
  renderContributors() {
    const t = this.availableSources[this.currentSourceIndex]?.contributors;
    if (!t?.length) return E;
    const e = (t) =>
      x` <span aria-hidden="true">${Array.from(t.username)[0]}</span> ${t.avatar
          ? x`<img src="${t.avatar}" alt="" width="32" height="32" loading="lazy" decoding="async" @error="${(
            t,
          ) => {
            t.currentTarget.hidden = !0;
          }}" @load="${(t) => {
            t.currentTarget.hidden = !1;
          }}">`
          : E
        } `;
    return x`<div class="contributor-stack"> ${t.slice(0, 3).map((t) => x`<a class="contributor-avatar" href="${t.url || E}" target="_blank" rel="noopener noreferrer" tabindex="0" aria-label="${`${t.username} — ${t.roles.join(", ")}`}">${e(t)}<span class="contributor-tooltip" aria-hidden="true">${t.username} · ${t.roles.join(", ")}</span></a>`)} ${t.length > 3 ? x`<details class="contributor-overflow"> <summary aria-label="${t.length - 3 + " more contributors"}"> +${t.length - 3} </summary> <div class="contributor-menu"> ${t.slice(3).map((t) => x`<a href="${t.url || E}" target="_blank" rel="noopener noreferrer" tabindex="0"><span class="contributor-avatar">${e(t)}</span><span>${t.username}<br>${t.roles.join(", ")}</span></a>`)} </div> </details>` : E} </div>`;
  }
  render() {
    (this.fontFamily && (this.style.fontFamily = this.fontFamily),
      this.style.setProperty("--highlight-color", this.highlightColor));
    const t = this.lyricsSource ?? "Unavailable",
      e = this.cachedIsUnsynced,
      i = this.lyrics?.some((t) => "end" !== t.alignment),
      r = this.lyrics?.some((t) => "end" === t.alignment),
      s = i && r;
    return x` <div class="lyrics-container ${e ? "is-unsynced" : ""} ${e || this.noBlur ? "" : "blur-inactive-enabled"} ${s ? "has-duet-lines" : ""} ${this.shouldReduceMotion ? "reduced-motion" : ""}" role="region" aria-label="Synced lyrics"> ${!this.isLoading && this.lyrics && this.lyrics.length > 0
        ? x` <div class="lyrics-header"> <div class="header-controls"> <button type="button" class="download-button ${this.showRomanization ? "active" : ""}" @click="${this.toggleRomanization}" title="Toggle Romanization" aria-label="Toggle romanization" aria-pressed="${this.showRomanization}"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-speech-icon lucide-speech"> <path d="M8.8 20v-4.1l1.9.2a2.3 2.3 0 0 0 2.164-2.1V8.3A5.37 5.37 0 0 0 2 8.25c0 2.8.656 3.054 1 4.55a5.77 5.77 0 0 1 .029 2.758L2 20"/> <path d="M19.8 17.8a7.5 7.5 0 0 0 .003-10.603"/> <path d="M17 15a3.5 3.5 0 0 0-.025-4.975"/> </svg> </button> <button type="button" class="download-button ${this.showTranslation ? "active" : ""}" @click="${this.toggleTranslation}" title="Toggle Translation" aria-label="Toggle translation" aria-pressed="${this.showTranslation}"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-languages-icon lucide-languages"> <path d="m5 8 6 6"/> <path d="m4 14 6-6 2-3"/> <path d="M2 5h12"/> <path d="M7 2h1"/> <path d="m22 22-5-10-5 10"/> <path d="M14 18h6"/> </svg> </button> </div> <div class="download-controls"> <select class="format-select" aria-label="Lyrics download format" @change="${(
          t,
        ) => {
          this.downloadFormat = t.target.value;
        }}" .value="${this.downloadFormat}" @click="${(t) => t.stopPropagation()}"> <option value="auto">Auto</option> <option value="lrc">LRC</option> <option value="ttml">TTML</option> <option value="plain">Plain</option> </select> <button type="button" class="download-button" @click="${this.downloadLyrics}" title="Download Lyrics" aria-label="Download lyrics"> <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download-icon lucide-download"> <path d="M12 15V3"/> <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/> <path d="m7 10 5 5 5-5"/> </svg> </button> </div> </div> `
        : ""
      } ${(() => {
        if (this.isLoading)
          return x` <div class="skeleton-line"></div> <div class="skeleton-line"></div> <div class="skeleton-line"></div> <div class="skeleton-line"></div> <div class="skeleton-line"></div> <div class="skeleton-line"></div> <div class="skeleton-line"></div> `;
        if (!this.lyrics || 0 === this.lyrics.length)
          return x`<div class="no-lyrics">No lyrics found.</div>`;
        const t = this.findAllInstrumentalGaps(),
          i = new Map(t.map((t) => [t.insertBeforeIndex, t]));
        return this.lyrics.map((t, r) => {
          const s = `lyrics-line-${r}`,
            n = t.text[0]?.timestamp || 0,
            a = t.text[t.text.length - 1]?.endtime || 0,
            o = t.backgroundText && t.backgroundText.length > 0,
            l = o ? AmLyrics.getBackgroundTextPlacement(t) : "after",
            c = [],
            d = t.backgroundText || [];
          for (let t = 0; t < d.length;) {
            let e = t;
            for (
              ;
              e + 1 < d.length &&
              !/\s$/.test(d[e].text) &&
              !/^\s/.test(d[e + 1].text);
            )
              e += 1;
            const i = {
              text: d
                .slice(t, e + 1)
                .map((t) => t.text)
                .join(""),
              start: d[t].timestamp,
              end: d[e].endtime,
            };
            for (let r = t; r <= e; r += 1) c[r] = i;
            t = e + 1;
          }
          const h = this.cachedLineData?.[r]?.lineIsRTL ?? !1,
            m = o
              ? x`<p class="background-vocal-container background-${l}"> <span class="background-vocal-wrap"> ${t.backgroundText.map(
                (t, e) => {
                  const i = t.timestamp,
                    s = t.endtime,
                    n = s - i,
                    a =
                      this.showRomanization &&
                        t.romanizedText &&
                        t.romanizedText.trim() !== t.text.trim()
                        ? x`<span class="lyrics-syllable transliteration no-chars ${t.lineSynced ? "line-synced" : ""}" data-start-time="${i}" data-end-time="${s}" data-duration="${n}" data-syllable-index="0" data-wipe-ratio="1">${t.romanizedText}</span>`
                        : "",
                    o = c[e],
                    l =
                      t.lineSynced ||
                        "none" ===
                        AmLyrics.characterMotionMode(
                          o.text,
                          o.end - o.start,
                          !0,
                        )
                        ? []
                        : Array.from(t.text.replace(/\s/g, ""));
                  let d = 0;
                  return x`<span class="lyrics-word${l.length ? " char-rise" : ""}" data-virtual-word-id="bg-${r}-${o.start}" data-virtual-word-start="${o.start}" data-virtual-word-end="${o.end}"><span class="lyrics-syllable-wrap${a ? " has-transliteration" : ""}"><span class="lyrics-syllable${h ? " rtl-text" : ""} ${l.length ? "has-chars" : "no-chars"}${t.lineSynced ? " line-synced" : ""}" data-start-time="${i}" data-end-time="${s}" data-duration="${n}" data-syllable-index="0" data-word-index="${e}" data-word-length="${t.text.replace(/\s/g, "").length}" data-wipe-ratio="1">${l.length
                      ? Array.from(t.text).map((t) => {
                        if (/\s/.test(t)) return t;
                        const e = d;
                        return (
                          (d += 1),
                          x`<span class="char-motion"><span class="char" data-syllable-char-index="${e}" data-wipe-start="${e / l.length}" data-wipe-duration="${1 / l.length}">${t}</span></span>`
                        );
                      })
                      : t.text
                    }</span>${a}</span></span>`;
                },
              )} </span> </p>`
              : "",
            p = this.cachedLineData?.[r],
            u = p?.wordGroups ?? [],
            y = p?.groupGrowable ?? [],
            g = p?.groupGlowing ?? [],
            f = p?.groupCharRise ?? [],
            b = p?.groupCharDrag ?? [],
            v = p?.vwFullDuration ?? [],
            L = p?.vwCharOffset ?? [],
            A = p?.vwStartMs ?? [],
            w = p?.vwEndMs ?? [],
            S = x`<p class="main-vocal-container ${h ? "rtl-text" : ""}"> ${u.map(
              (e, i) => {
                const s = y[i],
                  n = g[i],
                  a = f[i],
                  o = b[i],
                  l = s || a || o,
                  c = !1 === t.isWordSynced || e.some((t) => t.lineSynced),
                  d = l ? v[i] : 0,
                  m = l ? L[i] : 0,
                  p = `${r}:${A[i]}:${w[i]}`,
                  u = A[i],
                  S = w[i];
                let k = 0;
                const $ = e.map((t) => t.text).join(""),
                  T = $.replace(/\s/g, "").length,
                  E =
                    $.trim().length >= 16 ||
                    /[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/.test(
                      $,
                    );
                return x`<span class="lyrics-word${s ? " growable" : ""}${a ? " char-rise" : ""}${o ? " char-drag" : ""}${n ? " glowing" : ""}${E ? " allow-break" : ""}" data-virtual-word-id="${p}" data-virtual-word-start="${u}" data-virtual-word-end="${S}">${e.map(
                  (t, e) => {
                    const r = t.timestamp,
                      s = t.endtime,
                      n = s - r,
                      a = t.text || "",
                      o =
                        this.showRomanization &&
                          t.romanizedText &&
                          t.romanizedText.trim() !== t.text.trim()
                          ? x`<span class="lyrics-syllable transliteration no-chars ${c ? "line-synced" : ""}" data-start-time="${r}" data-end-time="${s}" data-duration="${n}" data-syllable-index="0" data-wipe-ratio="1">${t.romanizedText}</span>`
                          : "",
                      p = l && !c;
                    let u = a;
                    return (
                      p &&
                      (u = x`${Array.from(a).map((t) => {
                        if (" " === t) return " ";
                        const e = m + k;
                        return (
                          (k += 1),
                          x`<span class="char-motion"><span class="char" data-char-index="${e}" data-syllable-char-index="${e}">${t}</span></span>`
                        );
                      })}`),
                      x`<span class="lyrics-syllable-wrap${o ? " has-transliteration" : ""}"><span class="lyrics-syllable${h ? " rtl-text" : ""}${c ? " line-synced" : ""}${p ? " has-chars" : " no-chars"}" data-start-time="${r}" data-end-time="${s}" data-duration="${n}" data-word-duration="${d}" data-syllable-index="${e}" data-word-index="${i}" data-word-length="${T}" data-wipe-ratio="1">${u}</span>${o}</span>`
                    );
                  },
                )}</span>`;
              },
            )} </p>`,
            k = t.text
              .map((t) => t.text)
              .join("")
              .trim(),
            $ =
              this.showTranslation && t.translation && t.translation.trim() !== k
                ? x`<div class="lyrics-translation-container"> ${t.translation} </div>`
                : "",
            T =
              this.showRomanization &&
                t.romanizedText &&
                !t.text.some((t) => t.romanizedText) &&
                t.romanizedText.trim() !== k
                ? x`<div class="lyrics-romanization-container ${h ? "rtl-text" : ""}"> ${t.romanizedText} </div>`
                : "";
          let E = null;
          const _ = i.get(r);
          if (_) {
            const t = (_.gapEnd - _.gapStart) / 3;
            E = x`<div id="gap-${r}" class="lyrics-line lyrics-gap" aria-hidden="true" data-start-time="${_.gapStart}" data-end-time="${_.gapEnd}"> <p class="main-vocal-container"> <span class="lyrics-word"><span class="lyrics-syllable-wrap"><span class="lyrics-syllable" data-start-time="${_.gapStart}" data-end-time="${_.gapStart + t}" data-duration="${t}" data-wipe-ratio="1" data-syllable-index="0"></span></span><span class="lyrics-syllable-wrap"><span class="lyrics-syllable" data-start-time="${_.gapStart + t}" data-end-time="${_.gapStart + 2 * t}" data-duration="${t}" data-wipe-ratio="1" data-syllable-index="1"></span></span><span class="lyrics-syllable-wrap"><span class="lyrics-syllable" data-start-time="${_.gapStart + 2 * t}" data-end-time="${_.gapEnd}" data-duration="${t}" data-wipe-ratio="1" data-syllable-index="2"></span></span></span> </p> </div>`;
          }
          return x` ${E} <div id="${s}" class="lyrics-line ${"end" === t.alignment ? "singer-right" : "singer-left"} ${h ? "rtl-text" : ""} ${o ? `bg-${l}` : ""}" role="${e ? "paragraph" : "button"}" aria-label="${e ? k : `Seek to lyric: ${k}`}" data-start-time="${n}" data-end-time="${a}" @click="${() => this.handleLineClick(t)}" tabindex="${e ? -1 : 0}" @keydown="${(
            e,
          ) => {
            ("Enter" !== e.key && " " !== e.key) || this.handleLineClick(t);
          }}"> <div class="lyrics-line-container ${h ? "rtl-text" : ""}"> ${"before" === l ? m : ""} ${S} ${"after" === l ? m : ""} ${T} ${$} </div> </div> `;
        });
      })()} ${this.isLoading
        ? ""
        : x` <footer class="lyrics-footer lyrics-line"> <div class="footer-content"> <div class="source-info" style="display: flex; align-items: center; gap: 8px;"> <b style="font-weight: 750;">Source</b> ${t} ${this.renderContributors()} ${(this.availableSources && this.availableSources.length > 1) ||
            !this.hasFetchedAllProviders
            ? x` <button type="button" class="download-button source-switch-btn" title="Switch Lyrics Source" aria-label="Switch lyrics source" @click="${this.switchSource}" ?disabled="${this.isFetchingAlternatives}"> <svg class="source-switch-svg lucide lucide-arrow-down-up-icon lucide-arrow-down-up ${this.isFetchingAlternatives ? "is-loading" : ""}" xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"> ${this.isFetchingAlternatives
                ? b`<path
                                    d="M21 12a9 9 0 1 1-6.219-8.56"
                                  ></path>`
                : b`<path d="m3 16 4 4 4-4"></path
                                    ><path d="M7 20V4"></path
                                    ><path d="m21 8-4-4-4 4"></path
                                    ><path d="M17 4v16"></path>`
              } </svg> <span class="source-switch-label">${this.isFetchingAlternatives ? "Switching..." : "Switch"}</span> </button> `
            : ""
          } </div> ${this.songwriters ? x`<span class="songwriters-info" style="margin-top: 4px; font-weight: normal; font-size: 0.9em;"> <b style="font-weight: 750;">Songwriters</b> ${this.songwriters} </span>` : ""} <span class="version-info" style="margin-top: 8px;"> <b style="font-weight: 750;">am-lyrics</b> v${"1.8.7"} • <a href="https://github.com/uimaxbai/apple-music-web-components" target="_blank" rel="noopener noreferrer" style="display: inline-flex; align-items: center; gap: 4px;">Star me on GitHub </a> </span> </div> </footer> `
      } </div> `;
  }
}
((AmLyrics.styles = i$3`:host{--lyplus-lyrics-palette:var(--am-lyrics-highlight-color,var(--highlight-color,#fff));--lyplus-text-primary:var(--lyplus-lyrics-palette);--lyplus-text-secondary:color-mix(in srgb,var(--lyplus-lyrics-palette),transparent 45%);--lyplus-padding-base:1em;--lyplus-padding-line:10px;--lyplus-padding-gap:.3em;--lyplus-border-radius-base:.6em;--lyplus-gap-dot-size:.4em;--lyplus-gap-dot-margin:.08em;--lyplus-font-size-base:34px;--lyplus-font-size-base-grow:24.5;--lyplus-font-size-subtext:.6em;--am-lyrics-line-height:1.2;--am-lyrics-line-spacing:25px;--am-lyrics-background-vocal-spacing:15px;--am-lyrics-background-vocal-font-size:.65em;--am-lyrics-background-vocal-stack-shift:7.5px;--am-lyrics-background-vocal-max-height:8em;--am-lyrics-background-vocal-enter-duration:.65s;--am-lyrics-background-vocal-exit-duration:.45s;--am-lyrics-instrumental-height:40px;--am-lyrics-instrumental-spacing:16px;--am-lyrics-instrumental-enter-duration:.4s;--am-lyrics-instrumental-collapse-duration:.5s;--am-lyrics-instrumental-exit-duration:.35s;--am-lyrics-instrumental-exit-scale:0;--am-lyrics-inactive-scale:.98;--am-lyrics-background-vocal-scale:.96;--am-lyrics-touch-scale:.96;--am-lyrics-highlight-radius:16px;--am-lyrics-highlight-surface:#ffffff14;--am-lyrics-progression-feather:30px;--am-lyrics-glow-radius:5px;--am-lyrics-inline-padding:20px;--am-lyrics-lift:1;--char-rise-y:-3px;--am-lyrics-character-rise-peak:-1.25px;--lyplus-blur-amount:.07em;--lyplus-blur-amount-near:.035em;--lyplus-fade-gap-timing-function:ease-out;--wipe-gradient-width:var(--am-lyrics-progression-feather);--wipe-gradient-half:calc(var(--am-lyrics-progression-feather)/2);--lyrics-scroll-padding-top:12%;height:100%;color:var(--lyplus-text-primary);-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale;background:0 0;font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Oxygen,Ubuntu,Cantarell,Open Sans,Helvetica Neue,sans-serif;font-weight:700;display:block;overflow:hidden;container-type:inline-size}.lyrics-container{padding:60px var(--am-lyrics-inline-padding)calc(var(--am-lyrics-instrumental-height) + var(--am-lyrics-instrumental-spacing));-webkit-overflow-scrolling:touch;-webkit-touch-callout:none;-webkit-user-select:none;user-select:none;box-sizing:border-box;scrollbar-width:none;overflow-anchor:none;overscroll-behavior-y:contain;width:100%;height:100%;max-height:100vh;background-color:#0000;scroll-padding-block-start:var(--lyrics-scroll-padding-top);position:relative;overflow-y:auto}.lyrics-container::-webkit-scrollbar{display:none}.lyrics-container.touch-scrolling .lyrics-line,.lyrics-container.touch-scrolling .lyrics-plus-metadata{filter:none!important;transition:none!important}.lyrics-container.wheel-scrolling .lyrics-line{filter:none!important;transition:transform .3s ease-out!important}.lyrics-container.user-scrolling .lyrics-line{--lyrics-line-delay:0s!important;transition-delay:0s!important}.lyrics-line{isolation:isolate;padding:0 var(--lyplus-padding-line);opacity:.8;color:var(--lyplus-text-secondary);font-size:var(--lyplus-font-size-base);line-height:var(--am-lyrics-line-height);cursor:pointer;transform-origin:0;transition:opacity .7s ease,transform .4s cubic-bezier(.41,0,.12,.99)var(--lyrics-line-delay,0s),filter .7s ease;contain:layout style;text-rendering:optimizeLegibility;margin-block-end:var(--am-lyrics-line-spacing);position:relative}.lyrics-line:before{content:"";z-index:-1;border-radius:var(--am-lyrics-highlight-radius);background:var(--am-lyrics-highlight-surface);opacity:0;pointer-events:none;transition:opacity .18s cubic-bezier(.2,0,0,1),transform .18s cubic-bezier(.2,0,0,1),box-shadow .18s ease-out;position:absolute;inset:-6px -8px;transform:scale(.98);box-shadow:0 0 0 1px #0000}.lyrics-line:focus-visible{outline:none}.lyrics-line:focus-visible:before{opacity:1;box-shadow:0 0 0 2px color-mix(in srgb,var(--lyplus-text-primary)72%,transparent);transform:scale(1)}.lyrics-line{animation:none}.lyrics-line-container{overflow-wrap:break-word;transform-origin:0;transform:translateZ(0)scale(var(--am-lyrics-inactive-scale));transition:transform .7s,background-color .7s,color .7s;position:relative}.lyrics-line.active .lyrics-line-container,.lyrics-line.pre-active .lyrics-line-container{transition:transform .5s,background-color .18s,color .18s;transform:translateZ(0)scale(1)}.main-vocal-container{transform-origin:5%;transition:transform var(--scroll-duration,.4s)cubic-bezier(.2,.8,.2,1);margin:0}.background-vocal-container{--word-inactive-color:color-mix(in srgb,var(--lyplus-text-secondary)50%,#888);--word-wipe-color:color-mix(in srgb,var(--lyplus-text-primary)50%,#888);height:0;font-size:var(--am-lyrics-background-vocal-font-size);box-sizing:border-box;color:color-mix(in srgb,var(--lyplus-text-secondary)80%,transparent);pointer-events:none;margin:0;padding:0;line-height:1.22;position:relative;overflow:visible}.background-vocal-wrap{opacity:0;transform:translateY(var(--background-vocal-offset,6px))scale(var(--am-lyrics-background-vocal-scale));transform-origin:0;padding-top:.08em;padding-bottom:.14em;display:block}.lyrics-line.singer-right .background-vocal-container,.lyrics-line.rtl-text .background-vocal-container{margin-left:auto;margin-right:0}.lyrics-line.bg-expanded .background-vocal-container{height:var(--am-lyrics-background-vocal-height,var(--am-lyrics-background-vocal-max-height))}.lyrics-line.bg-expanded .background-vocal-wrap{opacity:1;transform:translateY(0)scale(1)}.lyrics-line.bg-collapsing .background-vocal-container{height:0}.lyrics-line.bg-collapsing .background-vocal-wrap{opacity:0;transform:translateY(var(--background-vocal-offset,6px))scale(var(--am-lyrics-background-vocal-scale))}.background-vocal-container.background-after .background-vocal-wrap{padding-top:calc(var(--am-lyrics-background-vocal-spacing) + .08em)}.background-vocal-container.background-before .background-vocal-wrap{--background-vocal-offset:-6px;padding-bottom:calc(var(--am-lyrics-background-vocal-spacing) + .14em)}.lyrics-line.singer-right .background-vocal-wrap,.lyrics-line.rtl-text .background-vocal-wrap{transform-origin:100%}.lyrics-container.user-scrolling .background-vocal-container,.lyrics-container.user-scrolling .background-vocal-wrap,.lyrics-container.touch-scrolling .background-vocal-container,.lyrics-container.touch-scrolling .background-vocal-wrap{transition-duration:1ms!important}.lyrics-line.active{opacity:1;color:var(--lyplus-text-primary)}.lyrics-line.pre-active{opacity:1;transition:opacity .7s ease,transform .4s cubic-bezier(.41,0,.12,.99)var(--lyrics-line-delay,0s)}.lyrics-line.scroll-exiting{opacity:.8;color:var(--lyplus-text-secondary);filter:blur(var(--lyplus-blur-amount-near));transition:opacity var(--scroll-duration,.4s)cubic-bezier(.41,0,.12,.99),transform var(--scroll-duration,.4s)cubic-bezier(.41,0,.12,.99)var(--lyrics-line-delay,0s),filter var(--scroll-duration,.4s)ease}.lyrics-line.persist-highlight .lyrics-syllable.finished,.lyrics-line.persist-highlight .lyrics-syllable.finished span.char{transition:none!important}.lyrics-line.singer-right{text-align:end}.lyrics-line.singer-right .lyrics-line-container,.lyrics-line.singer-right .main-vocal-container{transform-origin:100%}.lyrics-line.rtl-text{transform-origin:100%;direction:rtl;text-align:right!important}.lyrics-line.rtl-text .lyrics-line-container,.lyrics-line.rtl-text .main-vocal-container{transform-origin:100%}.lyrics-line.rtl-text .lyrics-romanization-container,.lyrics-line.rtl-text .lyrics-translation-container{text-align:right}.lyrics-container.has-duet-lines .lyrics-line.singer-left{padding-inline-end:max(var(--lyplus-padding-line),15%)}.lyrics-container.has-duet-lines .lyrics-line.singer-right{padding-inline-start:max(var(--lyplus-padding-line),15%)}.lyrics-container.is-unsynced .lyrics-line{cursor:default;opacity:1!important;color:var(--lyplus-text-primary)!important;filter:none!important;transform:none!important}.lyrics-container.is-unsynced .lyrics-line-container{background-color:#0000!important;transform:none!important}.lyrics-container.is-unsynced .lyrics-syllable{color:var(--lyplus-text-primary)!important;background-color:#0000!important;-webkit-background-clip:unset!important;background-clip:unset!important;-webkit-text-fill-color:unset!important;text-fill-color:unset!important;text-shadow:none!important;filter:none!important;opacity:1!important;transform:none!important}@media (hover:hover) and (pointer:fine){.lyrics-line:hover{filter:none!important}.lyrics-container.is-unsynced .lyrics-line:hover{background:0 0!important}}.lyrics-line:not(.lyrics-gap):active .lyrics-line-container{transform:translateZ(0)scale(var(--am-lyrics-touch-scale));transition-duration:.12s}.lyrics-container.blur-inactive-enabled:not(.not-focused) .lyrics-line:not(.active):not(.pre-active):not(.lyrics-gap){filter:blur(var(--lyplus-blur-amount))}.lyrics-line.far-line{filter:none!important;will-change:auto!important;animation:none!important}.lyrics-container.blur-inactive-enabled:not(.not-focused) .lyrics-line.post-active-line:not(.lyrics-gap):not(.active):not(.pre-active),.lyrics-container.blur-inactive-enabled:not(.not-focused) .lyrics-line.next-active-line:not(.lyrics-gap):not(.active):not(.pre-active),.lyrics-container.blur-inactive-enabled:not(.not-focused) .lyrics-line.lyrics-activest:not(.active):not(.lyrics-gap):not(.pre-active){filter:blur(var(--lyplus-blur-amount-near))}.lyrics-line.prev-2,.lyrics-line.next-2{opacity:.7}.lyrics-line.prev-3,.lyrics-line.next-3{opacity:.58}.lyrics-line.prev-4,.lyrics-line.next-4{opacity:.46}.lyrics-container.blur-inactive-enabled:not(.not-focused) .lyrics-line.next-active-line:not(.lyrics-gap):not(.active):not(.pre-active),.lyrics-container.blur-inactive-enabled:not(.not-focused) .lyrics-line.next-2:not(.lyrics-gap):not(.active):not(.pre-active){filter:blur(.028em)}.lyrics-container.blur-inactive-enabled:not(.not-focused) .lyrics-line.next-3:not(.lyrics-gap):not(.active):not(.pre-active){filter:blur(.05em)}.lyrics-container.blur-inactive-enabled:not(.not-focused) .lyrics-line.next-4:not(.lyrics-gap):not(.active):not(.pre-active){filter:blur(var(--lyplus-blur-amount))}.lyrics-container.user-scrolling .lyrics-line{filter:none!important;opacity:.8!important;transition:none!important}.lyrics-container.blur-inactive-enabled .lyrics-line.pre-active:not(.progressive-unblur){opacity:1;filter:none!important}.lyrics-line.progressive-unblur{transition:opacity .7s ease,transform .4s cubic-bezier(.41,0,.12,.99)var(--lyrics-line-delay,0s),filter 0s linear}.lyrics-word:not(.allow-break){vertical-align:baseline;white-space:nowrap;display:inline-block}.lyrics-word.allow-break{display:inline}.lyrics-line .lyrics-word .lyrics-syllable.has-chars{transform:none!important}.lyrics-line .lyrics-word.normal-word-motion .lyrics-syllable.no-chars{transition-property:color,background-color,opacity!important}.lyrics-line .lyrics-word.normal-word-motion:not(.allow-break) .lyrics-syllable.no-chars{transform:none!important}.lyrics-word.normal-word-motion.word-started:not(.allow-break){transform:translate3d(0,calc(var(--char-rise-y)*var(--am-lyrics-lift)),0)}.lyrics-line .lyrics-word .lyrics-syllable .char.native-motion{transform-origin:50% 80%;transition-property:color,background-color!important}.reduced-motion .lyrics-line .lyrics-word .lyrics-syllable .char.native-motion{text-shadow:none!important;transform:none!important}.lyrics-word.char-rise,.lyrics-word.char-drag{vertical-align:baseline;white-space:nowrap;display:inline-block}.lyrics-word.char-rise.allow-break,.lyrics-word.char-drag.allow-break{white-space:normal;display:inline}.lyrics-syllable-wrap{display:inline}.lyrics-syllable-wrap.has-transliteration{flex-direction:column;align-items:start;display:inline-flex}.lyrics-syllable{vertical-align:baseline;color:#0000;background-color:var(--lyplus-text-secondary);white-space:pre-wrap;font-variant-ligatures:none;font-feature-settings:"liga" 0;-webkit-background-clip:text;background-clip:text;transition:color .7s,background-color .7s,transform .7s;display:inline-block}.lyrics-syllable.finished{background-color:var(--lyplus-text-primary);transition:transform 1s,background-color .7s,color .7s}.lyrics-syllable.finished.has-chars{background-color:#0000}.lyrics-line.active:not(.lyrics-gap) .lyrics-syllable{transition:transform 1s,background-color .5s,color .5s}.lyrics-line .lyrics-word .lyrics-syllable.line-synced{transform:none!important}.lyrics-line.active:not(.lyrics-gap) .lyrics-syllable.highlight.no-chars,.lyrics-line.active:not(.lyrics-gap) .lyrics-syllable.pre-highlight.no-chars{background-repeat:no-repeat;background-image:linear-gradient(90deg,var(--lyplus-text-primary,#fff)0%,var(--lyplus-text-primary,#fff)calc(100% - var(--wipe-gradient-width,.75em)),#0000 100%);background-position:0;background-size:0% 100%}.lyrics-line.active:not(.lyrics-gap) .lyrics-syllable.highlight.rtl-text,.lyrics-line.active:not(.lyrics-gap) .lyrics-syllable.pre-highlight.rtl-text{background-image:linear-gradient(-90deg,var(--lyplus-text-primary)0%,var(--lyplus-text-primary)calc(100% - var(--wipe-gradient-width,.75em)),transparent 100%);direction:rtl;background-position:right 0%;background-size:0% 100%}.lyrics-line.active .background-vocal-container .lyrics-syllable.highlight.no-chars,.lyrics-line.active .background-vocal-container .lyrics-syllable.pre-highlight.no-chars,.lyrics-line.pre-active .background-vocal-container .lyrics-syllable.highlight.no-chars,.lyrics-line.pre-active .background-vocal-container .lyrics-syllable.pre-highlight.no-chars{background-image:linear-gradient(90deg,color-mix(in srgb,var(--lyplus-text-primary,#fff)50%,#888)0%,color-mix(in srgb,var(--lyplus-text-primary,#fff)50%,#888)calc(100% - var(--wipe-gradient-width,.75em)),#0000 100%)}.lyrics-line.active .background-vocal-container .lyrics-syllable.highlight.rtl-text,.lyrics-line.active .background-vocal-container .lyrics-syllable.pre-highlight.rtl-text,.lyrics-line.pre-active .background-vocal-container .lyrics-syllable.highlight.rtl-text,.lyrics-line.pre-active .background-vocal-container .lyrics-syllable.pre-highlight.rtl-text{background-image:linear-gradient(-90deg,color-mix(in srgb,var(--lyplus-text-primary)50%,#888)0%,color-mix(in srgb,var(--lyplus-text-primary)50%,#888)calc(100% - var(--wipe-gradient-width,.75em)),transparent 100%)}.lyrics-line:not(.lyrics-gap) .lyrics-word.word-started:not(.growable):not(.char-rise):not(.char-drag) .lyrics-syllable.no-chars,.lyrics-line.active:not(.lyrics-gap) .lyrics-word.word-started .lyrics-syllable.no-chars,.lyrics-line.persist-highlight:not(.lyrics-gap) .lyrics-word .lyrics-syllable.no-chars.finished,.lyrics-word.growable .lyrics-syllable.cleanup .char,.lyrics-word.char-drag .lyrics-syllable.cleanup .char,.lyrics-line.persist-highlight .lyrics-word.growable .lyrics-syllable.finished .char,.lyrics-line.persist-highlight .lyrics-word.char-drag .lyrics-syllable.finished .char{transform:translate3d(0,calc(var(--char-rise-y,-1.12px)*var(--am-lyrics-lift)),0)}.background-vocal-container .lyrics-syllable{background-color:color-mix(in srgb,var(--lyplus-text-secondary)50%,#888)}.lyrics-line.active:not(.lyrics-gap) .background-vocal-container .lyrics-syllable.finished:not(.has-chars),.lyrics-line.pre-active .background-vocal-container .lyrics-syllable.finished:not(.has-chars){background-color:color-mix(in srgb,var(--lyplus-text-primary)50%,#888)}.background-vocal-container .lyrics-syllable.line-synced{color:color-mix(in srgb,var(--lyplus-text-secondary)50%,#888)!important}.lyrics-line.active:not(.lyrics-gap) .background-vocal-container .lyrics-syllable.line-synced,.lyrics-line.pre-active .background-vocal-container .lyrics-syllable.line-synced,.lyrics-line.active:not(.lyrics-gap) .background-vocal-container .lyrics-syllable.line-synced.finished,.lyrics-line.pre-active .background-vocal-container .lyrics-syllable.line-synced.finished{color:color-mix(in srgb,var(--lyplus-text-primary)50%,#888)!important}.lyrics-line.active:not(.lyrics-gap) .background-vocal-container .lyrics-word.word-started .lyrics-syllable.no-chars,.lyrics-line.persist-highlight:not(.lyrics-gap) .background-vocal-container .lyrics-word .lyrics-syllable.no-chars.finished{transform:translate3d(0,calc(var(--char-rise-y)*var(--am-lyrics-lift)),0)}.lyrics-line.active:not(.lyrics-gap) .lyrics-word.char-rise.word-started .lyrics-syllable.transliteration:not(.highlight):not(.finished){transform:none}.lyrics-syllable.pre-highlight{animation-name:pre-wipe-universal;animation-duration:var(--pre-wipe-duration);animation-delay:var(--pre-wipe-delay);animation-timing-function:linear;animation-fill-mode:forwards}.lyrics-syllable.pre-highlight.rtl-text{animation-name:pre-wipe-universal-rtl}.lyrics-syllable.transliteration{font-size:var(--lyplus-font-size-subtext);white-space:pre-wrap;pointer-events:none;user-select:none}.lyrics-line .lyrics-word .lyrics-syllable.has-chars{color:#0000;background-color:#0000}.char-motion{vertical-align:baseline;transform-origin:50% 80%;display:inline-block}.lyrics-line:not(.far-line).active .char-motion,.lyrics-line:not(.far-line).pre-active .char-motion{will-change:transform}.lyrics-syllable .char-motion>.char{transform:none!important}.reduced-motion .char-motion{will-change:auto!important;transform:none!important}.lyrics-syllable span.char{background-color:var(--word-inactive-color,var(--lyplus-text-secondary));white-space:break-spaces;font-variant-ligatures:none;font-feature-settings:"liga" 0;-webkit-text-fill-color:transparent;transform-origin:50% 80%;background-origin:content-box;-webkit-background-clip:text;background-clip:text;margin-inline:-.04em;padding-inline:.04em;transition:color .7s,background-color .7s,transform .7s;display:inline-block;position:relative}.lyrics-line.active .char.native-motion[data-glow]:after{content:attr(data-glyph);pointer-events:none;color:#0000;-webkit-text-fill-color:transparent;text-shadow:0 0 .3em var(--lyplus-text-primary);animation:char-glow var(--char-glow-duration)linear var(--char-glow-delay)both;padding-inline:.04em;position:absolute;inset:0}@keyframes char-glow{0%,to{opacity:0}15%{opacity:calc(.8*var(--char-glow-max,0))}30%{opacity:var(--char-glow-max,0)}60%{opacity:calc(.3*var(--char-glow-max,0))}}.reduced-motion .char:after{display:none}.lyrics-syllable.finished span.char{background-color:var(--lyplus-text-primary);transition:color .7s,background-color .7s,transform .7s}.lyrics-word.char-drag span.char{transition:color .18s}.lyrics-line.active .lyrics-syllable span.char{background-repeat:no-repeat;-webkit-background-clip:text;background-clip:text;background-image:linear-gradient(90deg,var(--lyplus-text-primary,#fff)0%,var(--lyplus-text-primary,#fff)calc(100% - var(--wipe-gradient-width,.75em)),#0000 100%);background-size:calc(var(--word-wipe-width,1ch) + var(--wipe-gradient-width,.75em))100%;background-position:calc(var(--char-wipe-position,0px) - var(--word-wipe-width,1ch) - var(--wipe-gradient-width,.75em))0%;transition:transform .7s,color .18s}.lyrics-line.active .lyrics-syllable span.char.highlight{background-image:linear-gradient(-90deg,var(--lyplus-text-primary,#fff)0%,var(--lyplus-text-primary,#fff)calc(100% - var(--wipe-gradient-width,.75em)),#0000 100%);background-position:right 0%;background-size:0% 100%}.lyrics-line.active .lyrics-syllable span.char.pre-wipe-lead{animation-name:char-word-wipe;animation-duration:var(--pre-wipe-duration);animation-delay:var(--pre-wipe-delay);animation-timing-function:linear;animation-fill-mode:forwards}.lyrics-line.active .lyrics-syllable:not(.highlight):not(.pre-highlight):not(.finished) span.char:not(.shared-word-wipe){background-image:none}.lyrics-line .lyrics-word .lyrics-syllable.shared-word-wipe,.lyrics-line .lyrics-word .lyrics-syllable span.char.shared-word-wipe{color:var(--word-wipe-color,var(--lyplus-text-primary));-webkit-text-fill-color:transparent;background-repeat:no-repeat;background-size:calc(var(--word-wipe-width) + var(--wipe-gradient-width,.75em))100%;transition:color,background-color .7s,transform 1s;background-image:linear-gradient(90deg,currentColor 0%,currentColor calc(100% - var(--wipe-gradient-width,.75em)),transparent 100%)!important}.lyrics-line .lyrics-word .lyrics-syllable.shared-word-wipe.word-wipe-rtl,.lyrics-line .lyrics-word .lyrics-syllable span.char.shared-word-wipe.word-wipe-rtl{background-image:linear-gradient(-90deg,currentColor 0%,currentColor calc(100% - var(--wipe-gradient-width,.75em)),transparent 100%)!important}.lyrics-container:not(.is-unsynced) .lyrics-line:not(.active):not(.pre-active):not(.lyrics-gap),.lyrics-container:not(.is-unsynced) .lyrics-line.scroll-exiting{transition:opacity var(--scroll-duration,.35s)ease-out,transform .4s cubic-bezier(.41,0,.12,.99)var(--lyrics-line-delay,0s),filter var(--scroll-duration,.35s)ease-out}.lyrics-container:not(.is-unsynced) .lyrics-line:not(.active):not(.pre-active):not(.lyrics-gap) .lyrics-syllable,.lyrics-container:not(.is-unsynced) .lyrics-line:not(.active):not(.pre-active):not(.lyrics-gap) .lyrics-syllable span.char,.lyrics-container:not(.is-unsynced) .lyrics-line.scroll-exiting .lyrics-syllable,.lyrics-container:not(.is-unsynced) .lyrics-line.scroll-exiting .lyrics-syllable span.char{transition:color var(--scroll-duration,.35s)ease-out,background-color var(--scroll-duration,.35s)ease-out,opacity var(--scroll-duration,.35s)ease-out,transform .7s ease}.lyrics-container:not(.is-unsynced) .lyrics-line.scroll-exiting .lyrics-syllable.no-chars:not(.line-synced),.lyrics-container:not(.is-unsynced) .lyrics-line.scroll-exiting .lyrics-syllable span.char{color:#0000!important;background-color:var(--word-inactive-color,var(--lyplus-text-secondary))!important}.lyrics-line.scroll-exiting .char:after{opacity:0!important}.lyrics-container:not(.is-unsynced) .lyrics-line:not(.active):not(.pre-active):not(.lyrics-gap) .lyrics-syllable.no-chars:not(.line-synced),.lyrics-container:not(.is-unsynced) .lyrics-line:not(.active):not(.pre-active):not(.lyrics-gap) .lyrics-syllable span.char{background-image:none!important;background-color:var(--word-inactive-color,var(--lyplus-text-secondary))!important}.lyrics-gap{--gap-scale:0;--gap-opacity:0;height:0;padding:0 var(--lyplus-padding-line);opacity:1;box-sizing:border-box;background-clip:unset;transform-origin:top;transition:transform var(--scroll-duration,.28s);align-items:center;margin-block-end:0;display:flex;overflow:visible;content-visibility:visible!important;contain:none!important}.lyrics-gap.active{height:calc(var(--am-lyrics-instrumental-height) + var(--am-lyrics-instrumental-spacing));transition:transform var(--scroll-duration,.28s)}.lyrics-gap.gap-collapsing{height:0;transition:transform var(--scroll-duration,.28s)}.lyrics-gap .main-vocal-container{height:calc(var(--am-lyrics-instrumental-height) + var(--am-lyrics-instrumental-spacing) + var(--am-lyrics-line-spacing));opacity:0;transform-origin:50%;transition:opacity var(--scroll-duration,.4s)cubic-bezier(.4,0,.6,1),transform var(--scroll-duration,.4s)cubic-bezier(.2,0,.2,1);will-change:transform,opacity;align-items:center;margin:0;line-height:1;display:flex;position:absolute;inset-block-start:calc(0px - var(--am-lyrics-line-spacing));inset-inline-start:var(--lyplus-padding-line);transform:scale(0)}.lyrics-gap.active .main-vocal-container{opacity:var(--gap-opacity);transform:scale(var(--gap-scale));transition:none}.lyrics-gap.gap-collapsing .main-vocal-container,.lyrics-gap.gap-exiting .main-vocal-container{height:calc(var(--am-lyrics-instrumental-height) + var(--am-lyrics-instrumental-spacing) + var(--am-lyrics-line-spacing))}.lyrics-gap.gap-exiting .main-vocal-container{opacity:var(--gap-exit-opacity,0);transform:scale(var(--gap-exit-scale,var(--am-lyrics-instrumental-exit-scale)));transition:none}.lyrics-gap .lyrics-word,.lyrics-gap .lyrics-syllable-wrap{align-items:center;height:100%;display:flex}.lyrics-gap .lyrics-syllable{width:var(--lyplus-gap-dot-size);height:var(--lyplus-gap-dot-size);background-color:var(--lyplus-text-primary);margin:0 var(--lyplus-gap-dot-margin);border-radius:50%;display:inline-block}.lyrics-syllable.line-synced{opacity:.55;color:var(--lyplus-lyrics-palette)!important;background:0 0!important}.lyrics-line:is(.active,.pre-active) .lyrics-syllable.line-synced{color:var(--lyplus-text-primary)!important;animation:.2s ease-out forwards fade-in-line!important}.lyrics-line:is(.active,.pre-active) .lyrics-syllable.line-synced span.char{background-image:none!important;background-color:var(--lyplus-text-primary)!important;transition:background-color .12s ease-out!important}@keyframes fade-in-line{0%{opacity:.5;color:var(--lyplus-text-secondary)}to{opacity:1;color:var(--lyplus-lyrics-palette)}}.lyrics-gap .lyrics-syllable{background-color:var(--lyplus-text-primary);background-clip:unset;opacity:var(--gap-dot-opacity,.25)}.lyrics-gap.active .lyrics-syllable.finished,.lyrics-gap.gap-exiting .lyrics-syllable.finished,.lyrics-gap:not(.active):not(.gap-exiting).post-active-line .lyrics-syllable,.lyrics-gap:not(.active):not(.gap-exiting).lyrics-activest .lyrics-syllable{background-color:var(--lyplus-text-primary);animation:none!important}.lyrics-plus-metadata{box-sizing:border-box;transform:translateY(var(--lyrics-scroll-offset,0px));transition:opacity .3s ease,transform .6s cubic-bezier(.23,1,.32,1)var(--lyrics-line-delay,0s),filter .3s ease;font-weight:400;display:block;position:relative}.lyrics-plus-empty{height:100vh;transform:translateY(var(--lyrics-scroll-offset,0px));display:block}.lyrics-footer{text-align:left;font-size:calc(var(--lyplus-font-size-base)*.5);color:var(--lyplus-text-secondary);opacity:.8;transform-origin:0;flex-wrap:wrap;justify-content:space-between;align-items:center;margin-top:10px;padding:20px 0 50vh;font-weight:400;transition:opacity .3s,transform .5s cubic-bezier(.41,0,.12,.99),filter .3s;display:flex}.lyrics-footer.lyrics-line{font-size:calc(var(--lyplus-font-size-base)*.5);padding:20px var(--lyplus-padding-line)50vh var(--lyplus-padding-line);margin-top:0;margin-block-end:0}.lyrics-footer.active{opacity:1;color:#ffffff80}.contributor-stack{flex-shrink:0;align-items:center;display:flex}.contributor-avatar,.contributor-overflow>summary{box-sizing:border-box;color:#fff;cursor:pointer;background:#303030;border-radius:50%;outline:1px solid #ffffff29;flex:0 0 32px;justify-content:center;align-items:center;width:32px;height:32px;font:500 12px/1 sans-serif;text-decoration:none;display:inline-flex;position:relative;box-shadow:0 0 0 2px #222}.contributor-stack>*+*{margin-inline-start:-8px}.contributor-avatar img{border-radius:inherit;object-fit:cover;width:100%;height:100%;position:absolute;inset:0}.contributor-avatar:hover,.contributor-avatar:focus-visible,.contributor-overflow[open]{z-index:2}.contributor-avatar:focus-visible,.contributor-overflow>summary:focus-visible{outline:2px solid var(--lyplus-text-primary);outline-offset:3px}.contributor-tooltip,.contributor-menu{bottom:calc(100% + 10px);color:#fff;backdrop-filter:blur(18px)saturate(1.4);background:#202020d9;border-radius:14px;padding:9px 12px;font:500 12px/1.4 sans-serif;position:absolute;inset-inline-start:0;box-shadow:inset 0 0 0 1px #ffffff2e,0 8px 24px #00000040}.contributor-tooltip{opacity:0;pointer-events:none;width:max-content;max-width:220px;transition:opacity .14s ease-out,transform .14s ease-out;transform:translateY(3px)}.contributor-avatar:hover .contributor-tooltip,.contributor-avatar:focus-visible .contributor-tooltip{opacity:1;transform:none}.contributor-overflow{position:relative}.contributor-overflow>summary{font-variant-numeric:tabular-nums;list-style:none}.contributor-overflow>summary::-webkit-details-marker{display:none}.contributor-menu{flex-direction:column;gap:8px;width:max-content;max-width:min(260px,70vw);max-height:220px;display:flex;overflow:auto}.contributor-menu a{min-height:40px;color:inherit;align-items:center;gap:9px;text-decoration:none;display:flex}.contributor-menu .contributor-avatar{flex-shrink:0}@media (prefers-reduced-motion:reduce){.contributor-tooltip{transition:none}}.lyrics-container.blur-inactive-enabled:not(.not-focused) .lyrics-footer:not(.active){filter:blur(var(--lyplus-blur-amount));opacity:.5}.lyrics-container.user-scrolling .lyrics-footer{filter:none!important;opacity:.8!important;transition:none!important}.lyrics-footer p{margin:5px 0}.lyrics-footer a{color:var(--lyplus-text-primary);text-underline-offset:2px;opacity:.8;transition:opacity .2s}.lyrics-footer a:hover{opacity:1}.footer-content{flex-direction:column;align-items:flex-start;gap:8px;display:flex}.footer-controls{align-items:center;display:flex}.lyrics-header{z-index:2;inset:10px var(--am-lyrics-inline-padding)auto;justify-content:space-between;align-items:center;gap:10px;height:40px;margin:0;padding:0;display:none!important;position:absolute}.lyrics-header .download-button{cursor:pointer;width:40px;height:40px;color:color-mix(in srgb,var(--lyplus-text-primary)62%,transparent);vertical-align:middle;box-shadow:none;background:0 0;border:none;border-radius:12px;justify-content:center;align-items:center;margin:0;padding:0;font-family:inherit;transition:color .16s ease-out,background-color .16s ease-out,box-shadow .16s ease-out,transform .12s ease-out;display:inline-flex;position:relative}.lyrics-header .download-button:hover{color:var(--lyplus-text-primary);box-shadow:none;background:0 0}.lyrics-header .download-button.active{color:var(--lyplus-text-primary);background:0 0}.lyrics-header .download-button:active:not(:disabled){transform:scale(.96)}.lyrics-header .download-button:focus-visible,.source-switch-btn:focus-visible,.format-select:focus-visible{outline:2px solid color-mix(in srgb,var(--lyplus-text-primary)72%,transparent);outline-offset:2px}.header-controls{gap:8px;display:flex}.download-controls{align-items:center;gap:4px;display:flex}.source-switch-btn{box-sizing:border-box;color:#aaa;cursor:pointer;white-space:nowrap;background:#ffffff0f;border:0;border-radius:6px;flex:none;justify-content:center;align-items:center;height:26px;padding:0 8px;font-family:inherit;font-size:11px;line-height:1;transition:color .2s,border-color .2s,background-color .2s,transform .12s;display:inline-flex;position:relative}.source-switch-btn:active:not(:disabled){transform:scale(.96)}.source-switch-btn:disabled{cursor:default;opacity:.7}.source-switch-svg{flex:0 0 12px;width:12px;height:12px;margin-right:4px}.source-switch-svg.is-loading{animation:1s linear infinite source-switch-spin}.control-button{color:#fff9;cursor:pointer;background:0 0;border:1px solid #ffffff4d;border-radius:4px;padding:2px 8px;font-size:.8em;font-weight:400;transition:color .2s,border-color .2s,background-color .2s}.control-button:hover{color:#ffffffe6;border-color:#ffffff80}.control-button.active{background-color:var(--lyplus-text-primary);border-color:var(--lyplus-text-primary);color:#000}.format-select{box-sizing:border-box;color:#fff9;cursor:pointer;background:#ffffff0f;border:1px solid #ffffff4d;border-radius:6px;flex:none;height:28px;margin-left:0;padding:0 6px;font-family:inherit;font-size:12px;font-weight:400;line-height:normal}.format-select:hover{color:#ffffffe6;border-color:#ffffff80}.format-select option{color:#fff;background:#1a1a1a}.lyrics-translation-container,.lyrics-romanization-container{opacity:.8;font-size:var(--lyplus-font-size-subtext);overflow-wrap:break-word;pointer-events:none;user-select:none;padding-top:.2em;font-weight:400;transition:opacity .3s,color .3s}.lyrics-romanization-container{direction:ltr!important}.lyrics-romanization-container.rtl-text{text-align:right;direction:rtl!important}.lyrics-romanization-container .lyrics-syllable{white-space:pre-wrap}.lyrics-translation-container{opacity:.5}.main-line-wrapper.small{opacity:.8;margin-bottom:0;font-size:.5em;display:block}.translation-line{margin-top:0;font-size:1em;font-weight:700;line-height:1.1;display:block}.romanized-line{color:#ffffff80;margin-top:2px;font-size:.5em;font-weight:400;display:block}@keyframes skeleton-loading{0%{background-color:#ffffff1a}to{background-color:#fff3}}.skeleton-line{height:2.5em;margin:0 0 var(--am-lyrics-line-spacing);opacity:.7;border-radius:16px;width:60%;animation:1s linear infinite alternate skeleton-loading}.skeleton-line:nth-child(2n){width:80%}.skeleton-line:nth-child(3n){width:50%}.skeleton-line:nth-child(5n){width:70%}.no-lyrics{color:#ffffff80;text-align:center;padding:2em;font-size:1.2em;font-weight:400}@keyframes source-switch-spin{to{transform:rotate(360deg)}}@keyframes wipe{0%{background-position:0;background-size:0% 100%}to{background-size:calc(100% + var(--wipe-gradient-width,.75em))100%;background-position:0}}@keyframes wipe-from-pre{0%{background-size:var(--wipe-gradient-width,.75em)100%;background-position:0}to{background-size:calc(100% + var(--wipe-gradient-width,.75em))100%;background-position:0}}@keyframes start-wipe{0%{background-position:0;background-size:0% 100%}to{background-size:calc(100% + var(--wipe-gradient-width,.75em))100%;background-position:0}}@keyframes wipe-rtl{0%{background-position:right 0%;background-size:0% 100%}to{background-size:calc(100% + var(--wipe-gradient-width,.75em))100%;background-position:right 0%}}@keyframes wipe-from-pre-rtl{0%{background-size:var(--wipe-gradient-width,.75em)100%;background-position:right 0%}to{background-size:calc(100% + var(--wipe-gradient-width,.75em))100%;background-position:right 0%}}@keyframes start-wipe-rtl{0%{background-position:right 0%;background-size:0% 100%}to{background-size:calc(100% + var(--wipe-gradient-width,.75em))100%;background-position:right 0%}}@keyframes pre-wipe-universal{0%{background-position:0;background-size:0% 100%}to{background-size:var(--wipe-gradient-width,.75em)100%;background-position:0}}@keyframes pre-wipe-universal-rtl{0%{background-position:right 0%;background-size:0% 100%}to{background-size:var(--wipe-gradient-width,.75em)100%;background-position:right 0%}}@keyframes char-word-wipe{0%{background-position:calc(var(--char-wipe-position,0px) - var(--word-wipe-width,1ch) - var(--wipe-gradient-width,.75em))0%}to{background-position:var(--char-wipe-position,0px)0%}}@keyframes fade-gap{0%{background-color:var(--lyplus-text-secondary)}to{background-color:var(--lyplus-text-primary)}}@keyframes grow-static{0%,to{text-shadow:0 0 0 color-mix(in srgb,var(--lyplus-lyrics-palette),transparent 100%);transform:scale3d(1.01,1.01,1.1)translateY(-.05%)}30%,40%{text-shadow:0 0 .3em color-mix(in srgb,var(--lyplus-lyrics-palette),transparent 50%);transform:scale3d(1.1,1.1,1.1)translateY(-.05%)}}@keyframes fadeInUp{0%{opacity:0;transform:translateY(20px)}to{opacity:.7;transform:translateY(0)}}.opposite-turn{text-align:right}.singer-right{text-align:right;justify-content:flex-end}.singer-left{text-align:left;justify-content:flex-start}.progress-text{background:linear-gradient(to right,var(--lyplus-text-primary)0%,var(--lyplus-text-primary)var(--line-progress,0%),var(--lyplus-text-secondary)var(--line-progress,0%),var(--lyplus-text-secondary)100%);-webkit-text-fill-color:transparent;color:var(--lyplus-text-secondary);-webkit-background-clip:text;background-clip:text;display:inline-block;position:relative;transform:translate(0,0)}.progress-text:before{display:none}.active-line{font-weight:700}.background-text{color:var(--lyplus-text-secondary);flex-shrink:0;margin:0;font-size:.8em;font-style:normal;line-height:1.1;display:block}.background-text.before{order:-1}.background-text.after{order:1}.instrumental-line{color:var(--lyplus-text-secondary);align-items:baseline;gap:8px;padding:4px 10px;font-size:.9em;font-weight:400;animation:.22s fadeInUp;display:inline-flex}.instrumental-duration{color:var(--lyplus-text-secondary);font-size:.8em}@container (width<=519px){.lyrics-container{--lyplus-font-size-base:var(--am-lyrics-compact-font-size,28px);--am-lyrics-line-spacing:var(--am-lyrics-compact-line-spacing,20px);--am-lyrics-background-vocal-font-size:var(--am-lyrics-compact-background-vocal-font-size,.857em);--lyrics-scroll-padding-top:var(--am-lyrics-compact-selected-position,18%);--am-lyrics-inline-padding:14px}}@container (width>=900px){.lyrics-container{--lyplus-font-size-base:var(--am-lyrics-wide-font-size,48px);--am-lyrics-line-height:1.17;--am-lyrics-line-spacing:var(--am-lyrics-wide-line-spacing,32px);--am-lyrics-background-vocal-font-size:var(--am-lyrics-wide-background-vocal-font-size,.667em);--lyrics-scroll-padding-top:var(--am-lyrics-wide-selected-position,20%);--am-lyrics-inline-padding:32px}}@media (prefers-contrast:more){:host{--lyplus-text-secondary:color-mix(in srgb,var(--lyplus-lyrics-palette),transparent 24%)}.lyrics-line:focus-visible:before{box-shadow:0 0 0 3px var(--lyplus-text-primary)}}:host([no-blur]) .lyrics-line{filter:none!important;transition-property:opacity,transform!important}:host([hide-played-lines]) .lyrics-container:not(.user-scrolling):not(.touch-scrolling) .lyrics-line.played:not(:focus-within){opacity:0;pointer-events:none}.lyrics-container.reduced-motion .lyrics-line,.lyrics-container.reduced-motion .lyrics-line:before,.lyrics-container.reduced-motion .lyrics-line-container,.lyrics-container.reduced-motion .main-vocal-container,.lyrics-container.reduced-motion .background-vocal-container,.lyrics-container.reduced-motion .background-vocal-wrap,.lyrics-container.reduced-motion .lyrics-plus-metadata,.lyrics-container.reduced-motion .lyrics-footer{transition:none!important;animation:none!important}.lyrics-container.reduced-motion .lyrics-line,.lyrics-container.reduced-motion .lyrics-line-container,.lyrics-container.reduced-motion .main-vocal-container,.lyrics-container.reduced-motion .background-vocal-wrap,.lyrics-container.reduced-motion .lyrics-syllable,.lyrics-container.reduced-motion .lyrics-word.normal-word-motion,.lyrics-container.reduced-motion .lyrics-syllable span.char{transform:none!important}.lyrics-container.reduced-motion .lyrics-syllable span.char{filter:none!important;transition:none!important}`),
  (AmLyrics.lineSpringSamples = new Map()),
  (AmLyrics.wordWipes = new WeakMap()),
  (AmLyrics.wipeClocks = new WeakMap()),
  (AmLyrics.motionWords = new WeakMap()),
  (AmLyrics.normalWordMotions = new WeakMap()),
  (AmLyrics.normalRiseClocks = new WeakMap()),
  (AmLyrics.motionSyllables = new WeakMap()),
  (AmLyrics.motionParameters = new WeakMap()),
  (AmLyrics.characterFrames = new Map()),
  (AmLyrics.characterAnimations = new WeakMap()),
  __decorate([n({ type: String })], AmLyrics.prototype, "query", void 0),
  __decorate([n({ type: String })], AmLyrics.prototype, "musicId", void 0),
  __decorate(
    [n({ type: String, attribute: "spotify-id" })],
    AmLyrics.prototype,
    "spotifyId",
    void 0,
  ),
  __decorate([n({ type: String })], AmLyrics.prototype, "isrc", void 0),
  __decorate([n({ type: String })], AmLyrics.prototype, "ttml", void 0),
  __decorate(
    [n({ type: String, attribute: "song-title" })],
    AmLyrics.prototype,
    "songTitle",
    void 0,
  ),
  __decorate([r()], AmLyrics.prototype, "downloadFormat", void 0),
  __decorate(
    [n({ type: String, attribute: "song-artist" })],
    AmLyrics.prototype,
    "songArtist",
    void 0,
  ),
  __decorate(
    [n({ type: String, attribute: "song-album" })],
    AmLyrics.prototype,
    "songAlbum",
    void 0,
  ),
  __decorate(
    [n({ type: String, attribute: "songwriters" })],
    AmLyrics.prototype,
    "songwriters",
    void 0,
  ),
  __decorate(
    [n({ type: Number, attribute: "song-duration" })],
    AmLyrics.prototype,
    "songDurationMs",
    void 0,
  ),
  __decorate(
    [n({ type: String, attribute: "highlight-color" })],
    AmLyrics.prototype,
    "highlightColor",
    void 0,
  ),
  __decorate(
    [n({ type: String, attribute: "font-family" })],
    AmLyrics.prototype,
    "fontFamily",
    void 0,
  ),
  __decorate([n({ type: Boolean })], AmLyrics.prototype, "autoScroll", void 0),
  __decorate([n({ type: Boolean })], AmLyrics.prototype, "interpolate", void 0),
  __decorate(
    [n({ type: Boolean, attribute: "no-auto-alternates" })],
    AmLyrics.prototype,
    "noAutoAlternates",
    void 0,
  ),
  __decorate(
    [n({ type: Boolean, attribute: "no-blur", reflect: !0 })],
    AmLyrics.prototype,
    "noBlur",
    void 0,
  ),
  __decorate(
    [n({ type: Boolean, attribute: "hide-played-lines", reflect: !0 })],
    AmLyrics.prototype,
    "hidePlayedLines",
    void 0,
  ),
  __decorate(
    [n({ type: Boolean, attribute: "reduced-motion" })],
    AmLyrics.prototype,
    "reducedMotion",
    void 0,
  ),
  __decorate(
    [n({ type: String, attribute: "line-motion" })],
    AmLyrics.prototype,
    "lineMotion",
    void 0,
  ),
  __decorate([r()], AmLyrics.prototype, "systemReducedMotion", void 0),
  __decorate([r()], AmLyrics.prototype, "showRomanization", void 0),
  __decorate([r()], AmLyrics.prototype, "showTranslation", void 0),
  __decorate([n({ type: Number })], AmLyrics.prototype, "duration", void 0),
  __decorate(
    [n({ type: Number, attribute: "currenttime", hasChanged: () => !1 })],
    AmLyrics.prototype,
    "currentTime",
    null,
  ),
  __decorate([r()], AmLyrics.prototype, "isLoading", void 0),
  __decorate([r()], AmLyrics.prototype, "lyrics", void 0),
  __decorate([r()], AmLyrics.prototype, "lyricsSource", void 0),
  __decorate([r()], AmLyrics.prototype, "availableSources", void 0),
  __decorate([r()], AmLyrics.prototype, "currentSourceIndex", void 0),
  __decorate(
    [e(".lyrics-container")],
    AmLyrics.prototype,
    "lyricsContainer",
    void 0,
  ),
  window.customElements.define("am-lyrics", AmLyrics));
window.AmLyrics = AmLyrics;
//# sourceMappingURL=/sm/865d487ca2a6b4164a251b2394f2cfca2e883e37e0541ec55330a7ae7a3692b3.map
