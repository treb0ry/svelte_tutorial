
(function(l, r) { if (l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (window.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.head.appendChild(r) })(window.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }

    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function destroy_each(iterations, detaching) {
        for (let i = 0; i < iterations.length; i += 1) {
            if (iterations[i])
                iterations[i].d(detaching);
        }
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else
            node.setAttribute(attribute, value);
    }
    function to_number(value) {
        return value === '' ? undefined : +value;
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function set_input_value(input, value) {
        if (value != null || input.value) {
            input.value = value;
        }
    }
    function set_style(node, key, value, important) {
        node.style.setProperty(key, value, important ? 'important' : '');
    }
    function custom_event(type, detail) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, false, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function createEventDispatcher() {
        const component = current_component;
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }
    // TODO figure out if we still want to support
    // shorthand events, or if we want to implement
    // a real bubbling mechanism
    function bubble(component, event) {
        const callbacks = component.$$.callbacks[event.type];
        if (callbacks) {
            callbacks.slice().forEach(fn => fn(event));
        }
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    function flush() {
        const seen_callbacks = new Set();
        do {
            // first, call beforeUpdate functions
            // and update components
            while (dirty_components.length) {
                const component = dirty_components.shift();
                set_current_component(component);
                update(component.$$);
            }
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    callback();
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
    }
    function update($$) {
        if ($$.fragment) {
            $$.update($$.dirty);
            run_all($$.before_update);
            $$.fragment.p($$.dirty, $$.ctx);
            $$.dirty = null;
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function outro_and_destroy_block(block, lookup) {
        transition_out(block, 1, 1, () => {
            lookup.delete(block.key);
        });
    }
    function update_keyed_each(old_blocks, changed, get_key, dynamic, ctx, list, lookup, node, destroy, create_each_block, next, get_context) {
        let o = old_blocks.length;
        let n = list.length;
        let i = o;
        const old_indexes = {};
        while (i--)
            old_indexes[old_blocks[i].key] = i;
        const new_blocks = [];
        const new_lookup = new Map();
        const deltas = new Map();
        i = n;
        while (i--) {
            const child_ctx = get_context(ctx, list, i);
            const key = get_key(child_ctx);
            let block = lookup.get(key);
            if (!block) {
                block = create_each_block(key, child_ctx);
                block.c();
            }
            else if (dynamic) {
                block.p(changed, child_ctx);
            }
            new_lookup.set(key, new_blocks[i] = block);
            if (key in old_indexes)
                deltas.set(key, Math.abs(i - old_indexes[key]));
        }
        const will_move = new Set();
        const did_move = new Set();
        function insert(block) {
            transition_in(block, 1);
            block.m(node, next);
            lookup.set(block.key, block);
            next = block.first;
            n--;
        }
        while (o && n) {
            const new_block = new_blocks[n - 1];
            const old_block = old_blocks[o - 1];
            const new_key = new_block.key;
            const old_key = old_block.key;
            if (new_block === old_block) {
                // do nothing
                next = new_block.first;
                o--;
                n--;
            }
            else if (!new_lookup.has(old_key)) {
                // remove old block
                destroy(old_block, lookup);
                o--;
            }
            else if (!lookup.has(new_key) || will_move.has(new_key)) {
                insert(new_block);
            }
            else if (did_move.has(old_key)) {
                o--;
            }
            else if (deltas.get(new_key) > deltas.get(old_key)) {
                did_move.add(new_key);
                insert(new_block);
            }
            else {
                will_move.add(old_key);
                o--;
            }
        }
        while (o--) {
            const old_block = old_blocks[o];
            if (!new_lookup.has(old_block.key))
                destroy(old_block, lookup);
        }
        while (n)
            insert(new_blocks[n - 1]);
        return new_blocks;
    }

    function get_spread_update(levels, updates) {
        const update = {};
        const to_null_out = {};
        const accounted_for = { $$scope: 1 };
        let i = levels.length;
        while (i--) {
            const o = levels[i];
            const n = updates[i];
            if (n) {
                for (const key in o) {
                    if (!(key in n))
                        to_null_out[key] = 1;
                }
                for (const key in n) {
                    if (!accounted_for[key]) {
                        update[key] = n[key];
                        accounted_for[key] = 1;
                    }
                }
                levels[i] = n;
            }
            else {
                for (const key in o) {
                    accounted_for[key] = 1;
                }
            }
        }
        for (const key in to_null_out) {
            if (!(key in update))
                update[key] = undefined;
        }
        return update;
    }
    function get_spread_object(spread_props) {
        return typeof spread_props === 'object' && spread_props !== null ? spread_props : {};
    }
    function mount_component(component, target, anchor) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment.m(target, anchor);
        // onMount happens before the initial afterUpdate
        add_render_callback(() => {
            const new_on_destroy = on_mount.map(run).filter(is_function);
            if (on_destroy) {
                on_destroy.push(...new_on_destroy);
            }
            else {
                // Edge case - component was destroyed immediately,
                // most likely as a result of a binding initialising
                run_all(new_on_destroy);
            }
            component.$$.on_mount = [];
        });
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        if (component.$$.fragment) {
            run_all(component.$$.on_destroy);
            component.$$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            component.$$.on_destroy = component.$$.fragment = null;
            component.$$.ctx = {};
        }
    }
    function make_dirty(component, key) {
        if (!component.$$.dirty) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty = blank_object();
        }
        component.$$.dirty[key] = true;
    }
    function init(component, options, instance, create_fragment, not_equal, prop_names) {
        const parent_component = current_component;
        set_current_component(component);
        const props = options.props || {};
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props: prop_names,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            before_update: [],
            after_update: [],
            context: new Map(parent_component ? parent_component.$$.context : []),
            // everything else
            callbacks: blank_object(),
            dirty: null
        };
        let ready = false;
        $$.ctx = instance
            ? instance(component, props, (key, ret, value = ret) => {
                if ($$.ctx && not_equal($$.ctx[key], $$.ctx[key] = value)) {
                    if ($$.bound[key])
                        $$.bound[key](value);
                    if (ready)
                        make_dirty(component, key);
                }
                return ret;
            })
            : props;
        $$.update();
        ready = true;
        run_all($$.before_update);
        $$.fragment = create_fragment($$.ctx);
        if (options.target) {
            if (options.hydrate) {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.l(children(options.target));
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor);
            flush();
        }
        set_current_component(parent_component);
    }
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set() {
            // overridden by instance, if it has props
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, detail));
    }
    function append_dev(target, node) {
        dispatch_dev("SvelteDOMInsert", { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev("SvelteDOMInsert", { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev("SvelteDOMRemove", { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ["capture"] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev("SvelteDOMAddEventListener", { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev("SvelteDOMRemoveEventListener", { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev("SvelteDOMRemoveAttribute", { node, attribute });
        else
            dispatch_dev("SvelteDOMSetAttribute", { node, attribute, value });
    }
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.data === data)
            return;
        dispatch_dev("SvelteDOMSetData", { node: text, data });
        text.data = data;
    }
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error(`'target' is a required option`);
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn(`Component was already destroyed`); // eslint-disable-line no-console
            };
        }
    }

    /* src\Nested.svelte generated by Svelte v3.12.1 */

    const file = "src\\Nested.svelte";

    function create_fragment(ctx) {
    	var ul, li0, t0, t1, li1, t2, t3, li2, a, t4;

    	const block = {
    		c: function create() {
    			ul = element("ul");
    			li0 = element("li");
    			t0 = text(ctx.id);
    			t1 = space();
    			li1 = element("li");
    			t2 = text(ctx.name);
    			t3 = space();
    			li2 = element("li");
    			a = element("a");
    			t4 = text(ctx.url);
    			add_location(li0, file, 1, 2, 7);
    			add_location(li1, file, 2, 2, 23);
    			attr_dev(a, "href", ctx.url);
    			add_location(a, file, 3, 6, 45);
    			add_location(li2, file, 3, 2, 41);
    			add_location(ul, file, 0, 0, 0);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, ul, anchor);
    			append_dev(ul, li0);
    			append_dev(li0, t0);
    			append_dev(ul, t1);
    			append_dev(ul, li1);
    			append_dev(li1, t2);
    			append_dev(ul, t3);
    			append_dev(ul, li2);
    			append_dev(li2, a);
    			append_dev(a, t4);
    		},

    		p: function update(changed, ctx) {
    			if (changed.id) {
    				set_data_dev(t0, ctx.id);
    			}

    			if (changed.name) {
    				set_data_dev(t2, ctx.name);
    			}

    			if (changed.url) {
    				set_data_dev(t4, ctx.url);
    				attr_dev(a, "href", ctx.url);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(ul);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { id, name, url } = $$props;

    	const writable_props = ['id', 'name', 'url'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Nested> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    	};

    	$$self.$capture_state = () => {
    		return { id, name, url };
    	};

    	$$self.$inject_state = $$props => {
    		if ('id' in $$props) $$invalidate('id', id = $$props.id);
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('url' in $$props) $$invalidate('url', url = $$props.url);
    	};

    	return { id, name, url };
    }

    class Nested extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, ["id", "name", "url"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Nested", options, id: create_fragment.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.id === undefined && !('id' in props)) {
    			console.warn("<Nested> was created without expected prop 'id'");
    		}
    		if (ctx.name === undefined && !('name' in props)) {
    			console.warn("<Nested> was created without expected prop 'name'");
    		}
    		if (ctx.url === undefined && !('url' in props)) {
    			console.warn("<Nested> was created without expected prop 'url'");
    		}
    	}

    	get id() {
    		throw new Error("<Nested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set id(value) {
    		throw new Error("<Nested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get name() {
    		throw new Error("<Nested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set name(value) {
    		throw new Error("<Nested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	get url() {
    		throw new Error("<Nested>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set url(value) {
    		throw new Error("<Nested>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Thing.svelte generated by Svelte v3.12.1 */

    const file$1 = "src\\Thing.svelte";

    function create_fragment$1(ctx) {
    	var p, span0, t0, t1, span1, t2;

    	const block = {
    		c: function create() {
    			p = element("p");
    			span0 = element("span");
    			t0 = text("Initial");
    			t1 = space();
    			span1 = element("span");
    			t2 = text("Current");
    			set_style(span0, "background-color", ctx.initial);
    			attr_dev(span0, "class", "svelte-dgndg6");
    			add_location(span0, file$1, 6, 0, 69);
    			set_style(span1, "background-color", ctx.current);
    			attr_dev(span1, "class", "svelte-dgndg6");
    			add_location(span1, file$1, 7, 0, 125);
    			add_location(p, file$1, 5, 0, 65);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    			append_dev(p, span0);
    			append_dev(span0, t0);
    			append_dev(p, t1);
    			append_dev(p, span1);
    			append_dev(span1, t2);
    		},

    		p: function update(changed, ctx) {
    			if (changed.current) {
    				set_style(span1, "background-color", ctx.current);
    			}
    		},

    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$1.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { current } = $$props;
     const initial=current;

    	const writable_props = ['current'];
    	Object.keys($$props).forEach(key => {
    		if (!writable_props.includes(key) && !key.startsWith('$$')) console.warn(`<Thing> was created with unknown prop '${key}'`);
    	});

    	$$self.$set = $$props => {
    		if ('current' in $$props) $$invalidate('current', current = $$props.current);
    	};

    	$$self.$capture_state = () => {
    		return { current };
    	};

    	$$self.$inject_state = $$props => {
    		if ('current' in $$props) $$invalidate('current', current = $$props.current);
    	};

    	return { current, initial };
    }

    class Thing extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, ["current"]);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Thing", options, id: create_fragment$1.name });

    		const { ctx } = this.$$;
    		const props = options.props || {};
    		if (ctx.current === undefined && !('current' in props)) {
    			console.warn("<Thing> was created without expected prop 'current'");
    		}
    	}

    	get current() {
    		throw new Error("<Thing>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}

    	set current(value) {
    		throw new Error("<Thing>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
    	}
    }

    /* src\Inner.svelte generated by Svelte v3.12.1 */

    const file$2 = "src\\Inner.svelte";

    function create_fragment$2(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Click me";
    			add_location(button, file$2, 7, 0, 166);
    			dispose = listen_dev(button, "click", ctx.seyHello);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$2.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$2($$self) {
    	const dispatch=createEventDispatcher();
    function seyHello(){
      dispatch('message',{text:'Hello!'});
    }

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { seyHello };
    }

    class Inner extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "Inner", options, id: create_fragment$2.name });
    	}
    }

    /* src\FancyButton.svelte generated by Svelte v3.12.1 */

    const file$3 = "src\\FancyButton.svelte";

    function create_fragment$3(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Нажми меня";
    			attr_dev(button, "class", "svelte-4wmooo");
    			add_location(button, file$3, 12, 0, 208);
    			dispose = listen_dev(button, "click", ctx.click_handler);
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		p: noop,
    		i: noop,
    		o: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$3.name, type: "component", source: "", ctx });
    	return block;
    }

    function instance$3($$self) {
    	function click_handler(event) {
    		bubble($$self, event);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {};

    	return { click_handler };
    }

    class FancyButton extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "FancyButton", options, id: create_fragment$3.name });
    	}
    }

    /* src\App.svelte generated by Svelte v3.12.1 */

    const file$4 = "src\\App.svelte";

    function get_each_context(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.thing = list[i];
    	return child_ctx;
    }

    function get_each_context_1(ctx, list, i) {
    	const child_ctx = Object.create(ctx);
    	child_ctx.cat = list[i];
    	child_ctx.i = i;
    	return child_ctx;
    }

    // (72:0) {:else}
    function create_else_block_1(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Please,checked";
    			attr_dev(p, "class", "svelte-1haej5p");
    			add_location(p, file$4, 72, 0, 1502);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block_1.name, type: "else", source: "(72:0) {:else}", ctx });
    	return block;
    }

    // (70:0) {#if yes}
    function create_if_block_1(ctx) {
    	var p;

    	const block = {
    		c: function create() {
    			p = element("p");
    			p.textContent = "Thank you";
    			attr_dev(p, "class", "svelte-1haej5p");
    			add_location(p, file$4, 70, 0, 1477);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, p, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(p);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block_1.name, type: "if", source: "(70:0) {#if yes}", ctx });
    	return block;
    }

    // (86:0) {:else}
    function create_else_block(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "In";
    			add_location(button, file$4, 86, 0, 1775);
    			dispose = listen_dev(button, "click", ctx.toggle);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_else_block.name, type: "else", source: "(86:0) {:else}", ctx });
    	return block;
    }

    // (82:0) {#if user.loggedIn}
    function create_if_block(ctx) {
    	var button, dispose;

    	const block = {
    		c: function create() {
    			button = element("button");
    			button.textContent = "Out";
    			add_location(button, file$4, 82, 2, 1720);
    			dispose = listen_dev(button, "click", ctx.toggle);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, button, anchor);
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(button);
    			}

    			dispose();
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_if_block.name, type: "if", source: "(82:0) {#if user.loggedIn}", ctx });
    	return block;
    }

    // (92:0) {#each cats as cat,i}
    function create_each_block_1(ctx) {
    	var li, a_1, t0_value = ctx.i+1 + "", t0, t1, t2_value = ctx.cat.name + "", t2, t3;

    	const block = {
    		c: function create() {
    			li = element("li");
    			a_1 = element("a");
    			t0 = text(t0_value);
    			t1 = space();
    			t2 = text(t2_value);
    			t3 = space();
    			attr_dev(a_1, "target", "_blank");
    			attr_dev(a_1, "href", "https://www.youtube.com/watch?v=" + ctx.cat.id);
    			add_location(a_1, file$4, 92, 6, 1856);
    			add_location(li, file$4, 92, 2, 1852);
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, li, anchor);
    			append_dev(li, a_1);
    			append_dev(a_1, t0);
    			append_dev(a_1, t1);
    			append_dev(a_1, t2);
    			append_dev(a_1, t3);
    		},

    		p: noop,

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(li);
    			}
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block_1.name, type: "each", source: "(92:0) {#each cats as cat,i}", ctx });
    	return block;
    }

    // (106:0) {#each things as thing (thing.id)}
    function create_each_block(key_1, ctx) {
    	var first, current;

    	var thing = new Thing({
    		props: { current: ctx.thing.color },
    		$$inline: true
    	});

    	const block = {
    		key: key_1,

    		first: null,

    		c: function create() {
    			first = empty();
    			thing.$$.fragment.c();
    			this.first = first;
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, first, anchor);
    			mount_component(thing, target, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			var thing_changes = {};
    			if (changed.things) thing_changes.current = ctx.thing.color;
    			thing.$set(thing_changes);
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(thing.$$.fragment, local);

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(thing.$$.fragment, local);
    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(first);
    			}

    			destroy_component(thing, detaching);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_each_block.name, type: "each", source: "(106:0) {#each things as thing (thing.id)}", ctx });
    	return block;
    }

    function create_fragment$4(ctx) {
    	var label0, input0, input0_updating = false, t0, input1, t1, label1, input2, input2_updating = false, t2, input3, t3, p0, t4, t5, t6, t7, t8_value = ctx.a+ctx.b + "", t8, t9, label2, input4, t10, t11, t12, input5, t13, h1, t14, t15, t16, t17, t18, div, t19_value = ctx.m.x + "", t19, t20, t21_value = ctx.m.y + "", t21, t22, t23, ul, t24, button0, t26, p1, t27_value = ctx.numbers.join('+') + "", t27, t28, t29, t30, t31, button1, t33, each_blocks = [], each1_lookup = new Map(), each1_anchor, current, dispose;

    	function input0_input_handler() {
    		input0_updating = true;
    		ctx.input0_input_handler.call(input0);
    	}

    	function input2_input_handler() {
    		input2_updating = true;
    		ctx.input2_input_handler.call(input2);
    	}

    	function select_block_type(changed, ctx) {
    		if (ctx.yes) return create_if_block_1;
    		return create_else_block_1;
    	}

    	var current_block_type = select_block_type(null, ctx);
    	var if_block0 = current_block_type(ctx);

    	var fancybutton = new FancyButton({ $$inline: true });
    	fancybutton.$on("click", handleButtonClick);

    	var inner = new Inner({ $$inline: true });
    	inner.$on("message", ctx.message_handler);

    	function select_block_type_1(changed, ctx) {
    		if (ctx.user.loggedIn) return create_if_block;
    		return create_else_block;
    	}

    	var current_block_type_1 = select_block_type_1(null, ctx);
    	var if_block1 = current_block_type_1(ctx);

    	let each_value_1 = ctx.cats;

    	let each_blocks_1 = [];

    	for (let i = 0; i < each_value_1.length; i += 1) {
    		each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
    	}

    	var nested_spread_levels = [
    		ctx.obj
    	];

    	let nested_props = {};
    	for (var i = 0; i < nested_spread_levels.length; i += 1) {
    		nested_props = assign(nested_props, nested_spread_levels[i]);
    	}
    	var nested = new Nested({ props: nested_props, $$inline: true });

    	let each_value = ctx.things;

    	const get_key = ctx => ctx.thing.id;

    	for (let i = 0; i < each_value.length; i += 1) {
    		let child_ctx = get_each_context(ctx, each_value, i);
    		let key = get_key(child_ctx);
    		each1_lookup.set(key, each_blocks[i] = create_each_block(key, child_ctx));
    	}

    	const block = {
    		c: function create() {
    			label0 = element("label");
    			input0 = element("input");
    			t0 = space();
    			input1 = element("input");
    			t1 = space();
    			label1 = element("label");
    			input2 = element("input");
    			t2 = space();
    			input3 = element("input");
    			t3 = space();
    			p0 = element("p");
    			t4 = text(ctx.a);
    			t5 = text("+");
    			t6 = text(ctx.b);
    			t7 = text("=");
    			t8 = text(t8_value);
    			t9 = space();
    			label2 = element("label");
    			input4 = element("input");
    			t10 = text("\n  Yes, i want.");
    			t11 = space();
    			if_block0.c();
    			t12 = space();
    			input5 = element("input");
    			t13 = space();
    			h1 = element("h1");
    			t14 = text("Hi,");
    			t15 = text(ctx.name);
    			t16 = space();
    			fancybutton.$$.fragment.c();
    			t17 = space();
    			inner.$$.fragment.c();
    			t18 = space();
    			div = element("div");
    			t19 = text(t19_value);
    			t20 = space();
    			t21 = text(t21_value);
    			t22 = space();
    			if_block1.c();
    			t23 = space();
    			ul = element("ul");

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].c();
    			}

    			t24 = space();
    			button0 = element("button");
    			button0.textContent = "Add numbers";
    			t26 = space();
    			p1 = element("p");
    			t27 = text(t27_value);
    			t28 = text("=");
    			t29 = text(ctx.sum);
    			t30 = space();
    			nested.$$.fragment.c();
    			t31 = space();
    			button1 = element("button");
    			button1.textContent = "Delete first element";
    			t33 = space();

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].c();
    			}

    			each1_anchor = empty();
    			attr_dev(input0, "type", "number");
    			attr_dev(input0, "min", "0");
    			attr_dev(input0, "max", "10");
    			add_location(input0, file$4, 57, 0, 1155);
    			attr_dev(input1, "type", "range");
    			attr_dev(input1, "min", "0");
    			attr_dev(input1, "max", "10");
    			add_location(input1, file$4, 58, 0, 1203);
    			add_location(label0, file$4, 56, 0, 1147);
    			attr_dev(input2, "type", "number");
    			attr_dev(input2, "min", "0");
    			attr_dev(input2, "max", "10");
    			add_location(input2, file$4, 61, 0, 1267);
    			attr_dev(input3, "type", "range");
    			attr_dev(input3, "min", "0");
    			attr_dev(input3, "max", "10");
    			add_location(input3, file$4, 62, 0, 1315);
    			add_location(label1, file$4, 60, 0, 1259);
    			attr_dev(p0, "class", "svelte-1haej5p");
    			add_location(p0, file$4, 64, 0, 1371);
    			attr_dev(input4, "type", "checkbox");
    			add_location(input4, file$4, 66, 0, 1400);
    			add_location(label2, file$4, 65, 0, 1392);
    			add_location(input5, file$4, 74, 0, 1530);
    			add_location(h1, file$4, 75, 0, 1557);
    			add_location(div, file$4, 78, 0, 1642);
    			add_location(ul, file$4, 90, 0, 1823);
    			add_location(button0, file$4, 97, 0, 1971);
    			attr_dev(p1, "class", "svelte-1haej5p");
    			add_location(p1, file$4, 100, 0, 2024);
    			add_location(button1, file$4, 102, 0, 2076);

    			dispose = [
    				listen_dev(input0, "input", input0_input_handler),
    				listen_dev(input1, "change", ctx.input1_change_input_handler),
    				listen_dev(input1, "input", ctx.input1_change_input_handler),
    				listen_dev(input2, "input", input2_input_handler),
    				listen_dev(input3, "change", ctx.input3_change_input_handler),
    				listen_dev(input3, "input", ctx.input3_change_input_handler),
    				listen_dev(input4, "change", ctx.input4_change_handler),
    				listen_dev(input5, "input", ctx.input5_input_handler),
    				listen_dev(div, "mousemove", ctx.handleMouseMove),
    				listen_dev(button0, "click", ctx.addNumbers),
    				listen_dev(button1, "click", ctx.handlerClick)
    			];
    		},

    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},

    		m: function mount(target, anchor) {
    			insert_dev(target, label0, anchor);
    			append_dev(label0, input0);

    			set_input_value(input0, ctx.a);

    			append_dev(label0, t0);
    			append_dev(label0, input1);

    			set_input_value(input1, ctx.a);

    			insert_dev(target, t1, anchor);
    			insert_dev(target, label1, anchor);
    			append_dev(label1, input2);

    			set_input_value(input2, ctx.b);

    			append_dev(label1, t2);
    			append_dev(label1, input3);

    			set_input_value(input3, ctx.b);

    			insert_dev(target, t3, anchor);
    			insert_dev(target, p0, anchor);
    			append_dev(p0, t4);
    			append_dev(p0, t5);
    			append_dev(p0, t6);
    			append_dev(p0, t7);
    			append_dev(p0, t8);
    			insert_dev(target, t9, anchor);
    			insert_dev(target, label2, anchor);
    			append_dev(label2, input4);

    			input4.checked = ctx.yes;

    			append_dev(label2, t10);
    			insert_dev(target, t11, anchor);
    			if_block0.m(target, anchor);
    			insert_dev(target, t12, anchor);
    			insert_dev(target, input5, anchor);

    			set_input_value(input5, ctx.name);

    			insert_dev(target, t13, anchor);
    			insert_dev(target, h1, anchor);
    			append_dev(h1, t14);
    			append_dev(h1, t15);
    			insert_dev(target, t16, anchor);
    			mount_component(fancybutton, target, anchor);
    			insert_dev(target, t17, anchor);
    			mount_component(inner, target, anchor);
    			insert_dev(target, t18, anchor);
    			insert_dev(target, div, anchor);
    			append_dev(div, t19);
    			append_dev(div, t20);
    			append_dev(div, t21);
    			insert_dev(target, t22, anchor);
    			if_block1.m(target, anchor);
    			insert_dev(target, t23, anchor);
    			insert_dev(target, ul, anchor);

    			for (let i = 0; i < each_blocks_1.length; i += 1) {
    				each_blocks_1[i].m(ul, null);
    			}

    			insert_dev(target, t24, anchor);
    			insert_dev(target, button0, anchor);
    			insert_dev(target, t26, anchor);
    			insert_dev(target, p1, anchor);
    			append_dev(p1, t27);
    			append_dev(p1, t28);
    			append_dev(p1, t29);
    			insert_dev(target, t30, anchor);
    			mount_component(nested, target, anchor);
    			insert_dev(target, t31, anchor);
    			insert_dev(target, button1, anchor);
    			insert_dev(target, t33, anchor);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].m(target, anchor);
    			}

    			insert_dev(target, each1_anchor, anchor);
    			current = true;
    		},

    		p: function update(changed, ctx) {
    			if (!input0_updating && changed.a) set_input_value(input0, ctx.a);
    			input0_updating = false;
    			if (changed.a) set_input_value(input1, ctx.a);
    			if (!input2_updating && changed.b) set_input_value(input2, ctx.b);
    			input2_updating = false;
    			if (changed.b) set_input_value(input3, ctx.b);

    			if (!current || changed.a) {
    				set_data_dev(t4, ctx.a);
    			}

    			if (!current || changed.b) {
    				set_data_dev(t6, ctx.b);
    			}

    			if ((!current || changed.a || changed.b) && t8_value !== (t8_value = ctx.a+ctx.b + "")) {
    				set_data_dev(t8, t8_value);
    			}

    			if (changed.yes) input4.checked = ctx.yes;

    			if (current_block_type !== (current_block_type = select_block_type(changed, ctx))) {
    				if_block0.d(1);
    				if_block0 = current_block_type(ctx);
    				if (if_block0) {
    					if_block0.c();
    					if_block0.m(t12.parentNode, t12);
    				}
    			}

    			if (changed.name && (input5.value !== ctx.name)) set_input_value(input5, ctx.name);

    			if (!current || changed.name) {
    				set_data_dev(t15, ctx.name);
    			}

    			if ((!current || changed.m) && t19_value !== (t19_value = ctx.m.x + "")) {
    				set_data_dev(t19, t19_value);
    			}

    			if ((!current || changed.m) && t21_value !== (t21_value = ctx.m.y + "")) {
    				set_data_dev(t21, t21_value);
    			}

    			if (current_block_type_1 !== (current_block_type_1 = select_block_type_1(changed, ctx))) {
    				if_block1.d(1);
    				if_block1 = current_block_type_1(ctx);
    				if (if_block1) {
    					if_block1.c();
    					if_block1.m(t23.parentNode, t23);
    				}
    			}

    			if (changed.cats) {
    				each_value_1 = ctx.cats;

    				let i;
    				for (i = 0; i < each_value_1.length; i += 1) {
    					const child_ctx = get_each_context_1(ctx, each_value_1, i);

    					if (each_blocks_1[i]) {
    						each_blocks_1[i].p(changed, child_ctx);
    					} else {
    						each_blocks_1[i] = create_each_block_1(child_ctx);
    						each_blocks_1[i].c();
    						each_blocks_1[i].m(ul, null);
    					}
    				}

    				for (; i < each_blocks_1.length; i += 1) {
    					each_blocks_1[i].d(1);
    				}
    				each_blocks_1.length = each_value_1.length;
    			}

    			if ((!current || changed.numbers) && t27_value !== (t27_value = ctx.numbers.join('+') + "")) {
    				set_data_dev(t27, t27_value);
    			}

    			if (!current || changed.sum) {
    				set_data_dev(t29, ctx.sum);
    			}

    			var nested_changes = (changed.obj) ? get_spread_update(nested_spread_levels, [
    									get_spread_object(ctx.obj)
    								]) : {};
    			nested.$set(nested_changes);

    			const each_value = ctx.things;

    			group_outros();
    			each_blocks = update_keyed_each(each_blocks, changed, get_key, 1, ctx, each_value, each1_lookup, each1_anchor.parentNode, outro_and_destroy_block, create_each_block, each1_anchor, get_each_context);
    			check_outros();
    		},

    		i: function intro(local) {
    			if (current) return;
    			transition_in(fancybutton.$$.fragment, local);

    			transition_in(inner.$$.fragment, local);

    			transition_in(nested.$$.fragment, local);

    			for (let i = 0; i < each_value.length; i += 1) {
    				transition_in(each_blocks[i]);
    			}

    			current = true;
    		},

    		o: function outro(local) {
    			transition_out(fancybutton.$$.fragment, local);
    			transition_out(inner.$$.fragment, local);
    			transition_out(nested.$$.fragment, local);

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				transition_out(each_blocks[i]);
    			}

    			current = false;
    		},

    		d: function destroy(detaching) {
    			if (detaching) {
    				detach_dev(label0);
    				detach_dev(t1);
    				detach_dev(label1);
    				detach_dev(t3);
    				detach_dev(p0);
    				detach_dev(t9);
    				detach_dev(label2);
    				detach_dev(t11);
    			}

    			if_block0.d(detaching);

    			if (detaching) {
    				detach_dev(t12);
    				detach_dev(input5);
    				detach_dev(t13);
    				detach_dev(h1);
    				detach_dev(t16);
    			}

    			destroy_component(fancybutton, detaching);

    			if (detaching) {
    				detach_dev(t17);
    			}

    			destroy_component(inner, detaching);

    			if (detaching) {
    				detach_dev(t18);
    				detach_dev(div);
    				detach_dev(t22);
    			}

    			if_block1.d(detaching);

    			if (detaching) {
    				detach_dev(t23);
    				detach_dev(ul);
    			}

    			destroy_each(each_blocks_1, detaching);

    			if (detaching) {
    				detach_dev(t24);
    				detach_dev(button0);
    				detach_dev(t26);
    				detach_dev(p1);
    				detach_dev(t30);
    			}

    			destroy_component(nested, detaching);

    			if (detaching) {
    				detach_dev(t31);
    				detach_dev(button1);
    				detach_dev(t33);
    			}

    			for (let i = 0; i < each_blocks.length; i += 1) {
    				each_blocks[i].d(detaching);
    			}

    			if (detaching) {
    				detach_dev(each1_anchor);
    			}

    			run_all(dispose);
    		}
    	};
    	dispatch_dev("SvelteRegisterBlock", { block, id: create_fragment$4.name, type: "component", source: "", ctx });
    	return block;
    }

    function handleButtonClick(){
      alert('button is click');
    }

    function instance$4($$self, $$props, $$invalidate) {
    	
      let numbers=[1,2,3,4];
      
      function addNumbers(){
        $$invalidate('numbers', numbers=[...numbers,numbers.length+1]);
      }
      const cats=[
        { id: 'J---aiyznGQ', name: 'Кот на клавишных' },
    		{ id: 'z_AbfPXTKms', name: 'Мару' },
    		{ id: 'OUtn3pvWmpg', name: 'Экзистенциальный кот' }
      ];
      const user={
        loggedIn:false,
      };
     const obj={
       id:'4211',
       name:'Svelte',
       url:'https://svelte.dev'
     };
    const toggle=()=>{
      $$invalidate('user', user.loggedIn=!user.loggedIn, user);
     };
     let things = [
    		{ id: 1, color: '#0d0887' },
    		{ id: 2, color: '#6a00a8' },
    		{ id: 3, color: '#b12a90' },
    		{ id: 4, color: '#e16462' },
    		{ id: 5, color: '#fca636' }
      ];
      function handlerClick(){
        $$invalidate('things', things=things.slice(1));
      }
      let m={x:0,y:0};
      const handleMouseMove=(e)=>{
        $$invalidate('m', m.x=e.clientX, m);
        $$invalidate('m', m.y=e.clientY, m);
      };
      let name='';
      let a=0;
      let b=0;
      let yes=false;

    	function message_handler(event) {
    		bubble($$self, event);
    	}

    	function input0_input_handler() {
    		a = to_number(this.value);
    		$$invalidate('a', a);
    	}

    	function input1_change_input_handler() {
    		a = to_number(this.value);
    		$$invalidate('a', a);
    	}

    	function input2_input_handler() {
    		b = to_number(this.value);
    		$$invalidate('b', b);
    	}

    	function input3_change_input_handler() {
    		b = to_number(this.value);
    		$$invalidate('b', b);
    	}

    	function input4_change_handler() {
    		yes = this.checked;
    		$$invalidate('yes', yes);
    	}

    	function input5_input_handler() {
    		name = this.value;
    		$$invalidate('name', name);
    	}

    	$$self.$capture_state = () => {
    		return {};
    	};

    	$$self.$inject_state = $$props => {
    		if ('numbers' in $$props) $$invalidate('numbers', numbers = $$props.numbers);
    		if ('things' in $$props) $$invalidate('things', things = $$props.things);
    		if ('m' in $$props) $$invalidate('m', m = $$props.m);
    		if ('name' in $$props) $$invalidate('name', name = $$props.name);
    		if ('a' in $$props) $$invalidate('a', a = $$props.a);
    		if ('b' in $$props) $$invalidate('b', b = $$props.b);
    		if ('yes' in $$props) $$invalidate('yes', yes = $$props.yes);
    		if ('sum' in $$props) $$invalidate('sum', sum = $$props.sum);
    	};

    	let sum;

    	$$self.$$.update = ($$dirty = { numbers: 1 }) => {
    		if ($$dirty.numbers) { $$invalidate('sum', sum=numbers.reduce((t,n)=>t+n)); }
    	};

    	return {
    		numbers,
    		addNumbers,
    		cats,
    		user,
    		obj,
    		toggle,
    		things,
    		handlerClick,
    		m,
    		handleMouseMove,
    		name,
    		a,
    		b,
    		yes,
    		sum,
    		message_handler,
    		input0_input_handler,
    		input1_change_input_handler,
    		input2_input_handler,
    		input3_change_input_handler,
    		input4_change_handler,
    		input5_input_handler
    	};
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, []);
    		dispatch_dev("SvelteRegisterComponent", { component: this, tagName: "App", options, id: create_fragment$4.name });
    	}
    }

    const app = new App({
    	target: document.body,
    	props: {
    		name: 'world'
    	}
    });

    return app;

}());
//# sourceMappingURL=bundle.js.map
