/**
 * Copyright (c) 2014, Wanqiang Xia. All rights reserved.
 *
 * This program is open source software: you can redistribute it and/or
 * modify it under the terms of the BSD 2-Clause license.
 *
 * This program is a javascript implementation of QP framework as a YUI module.
 * You can visit QP website (http://www.state-machine.com) for more information
 */

/**
 * YQF, define QP active object framework in YUI
 */
YUI.add('yqf', function(Y) {
    var yqf = Y.namespace('yqf'),
        RET_HANDLED = 0,
        RET_IGNORED = 1,
        RET_TRANSFER = 2,
        RET_SUPER = 3,
        RET_UNHANDLED = 4,
        QF_TICK_RATE = 10,
        top = null;

    var ignored = function() {
        return RET_IGNORED;
    };

    var handled = function() {
        return RET_HANDLED;
    };

    var unhandled = function() {
        return RET_UNHANDLED;
    };

    /*
     * handler required, other optional
     */
    var QState = function(handler, parent, entry, exit, init) {
        this.handler = handler;

        if (typeof parent === 'undefined') {
            this.parent = top;
        } else {
            this.parent = parent;
        }

        this.entry = entry || handled;
        this.exit = exit || handled;
        this.init = init || handled;
    };

    top = new QState(ignored, null);

    /*
     * signal required, other optional
     */
    var QEvent = function(signal, data, sender) {
        this.signal = signal;

        if (typeof data === 'undefined') {
            this.data = null;
        } else {
            this.data = data;
        }

        if (typeof sender === 'undefined') {
            this.sender = null;
        } else {
            this.sender = sender;
        }
    };

    /*
     * ao, signal, all required
     */
    var QTimeEvent = function(ao, signal) {
        this.lastTick = Date.now();
        this.activeObject = ao;
        this.signal = signal;
        this.interval = 0;
        this.repeat = false;
    };



    /*
     * QHsm, defines the Hierarchical State Machine (HSM)
     */
    var QHsm = function(initial) {
        var state = top,
            target = initial;

        var findLca = function(p, q) {
            var ps = [],
                qs = [],
                t = top;

            ps.push(p);
            qs.push(q);

            while (p !== top) {
                p = p.parent;
                ps.push(p);
            }

            while(q !== top) {
                q = q.parent;
                qs.push(q);
            }

            while (ps.length > 0 && qs.length > 0) {
                p = ps.pop();
                q = qs.pop();
                if (p === q) {
                    t = p;
                } else {
                    break;
                }
            }

            return t;
        };

        this.transfer = function(t) {
            target = t;
            return RET_TRANSFER;
        };

        this.init = function(e) {
            var s = state,
                t = target,
                i = 0,
                r = RET_HANDLED,
                path = [];

            r = t.handler(e);

            do {                             // drill into the target...
                path = [];
                path.push(target);
                t = target.parent;
                while (s !== t) {
                    path.push(t);
                    t = t.parent;
                }

                for (i = path.length - 1; i >= 0; i--) {
                    path[i].entry();
                }

                s = target;
            } while (s.init() === RET_TRANSFER);

            state = s;                            // change the current active state
            target  = s;                           // mark the configuration as stable
        };

        //
        this.dispatch = function(e) {
            var s = state,
                t = target,
                p = top,
                r = RET_HANDLED,
                entries = [],
                exits = [];

            r = t.handler(e);
            while (r === RET_UNHANDLED) {
                t = t.parent;
                r = t.handler(e);
            }

            if (r === RET_TRANSFER) {
                // current -> transfer source, exit
                while (s !== t) {
                    exits.push(s);
                    s = s.parent;
                }

                if (s === target) {	// self transfer
                    exits.push(s);
                    entries.push(s);
                } else {
                    // Lca p
                    p = findLca(s, target);

                    // source -> p, exit
                    while (s !== p) {
                        exits.push(s);
                        s = s.parent;
                    }

                    // target -> p, entries
                    s = target;
                    while (s !== p) {
                        entries.push(s);
                        s = s.parent;
                    }
                }

                // do exists
                while (exits.length > 0) {
                    s = exits.shift();
                    s.exit();
                }

                // do entries
                while (entries.length > 0) {
                    t = entries.pop();
                    t.entry();
                }

                // drill in target, init
                t = target;
                while (t.init() === RET_TRANSFER) {
                    entries = [];
                    entries.push(target);
                    s = target.parent;
                    while (s !== t) {
                        entries.push(s);
                        s = s.parent;
                    }

                    while (entries.length > 0) {
                        entries.pop().entry();
                    }

                    t = target;
                }

                state = t;
                target = t;
            }
        };

        this.isIn = function(s) {
            var p = state;

            while (p !== top) {
                if (p === s) {
                    return true;
                }
                p = p.parent;
            }

            return false;
        };
    };

    QHsm.top = top;
    QHsm.ignored = ignored;
    QHsm.handled = handled;
    QHsm.unhandled = unhandled;

    /**
     * QActive, defines the active object
     */
    var QActive = function(initial) {
        var eventQueue = [],
            deferQueue = [];

        this.run = function() {
            var e = this.getEvent();

            if (e != null) {
                this.dispatch(e);
            }
        };

        this.schedule = function() {
            setTimeout(function() {
                this.run();
            }.bind(this), 0);
        };

        this.postFifo = function(e) {
            eventQueue.push(e);
            this.schedule();
        };

        this.postLifo = function(e) {
            eventQueue.unshift(e);
            this.schedule();
        };

        this.getEvent = function() {
            var result = null;

            if (eventQueue.length !== 0) {
                result = eventQueue.shift();
            }

            return result;
        };

        this.defer = function(e) {
            deferQueue.push(e);
        };

        this.recall = function() {
            var i = 0,
                e = null,
                length = deferQueue.length;

            for (i = 0; i < length; i++) {
                e = deferQueue.shift();
                eventQueue.push(e);
                this.schedule();
            }

            return length > 0;
        };

        this.priority = 0;
        QHsm.call(this, initial);
    };

    Y.extend(QActive, QHsm);

    var indexOf = function(array, item) {
        var i = 0,
            length = array.length;

        for (i = 0; i < length; i++) {
            if (array[i] === item) {
                return i;
            }
        }

        return -1;
    };

    /**
     * QF, defines the active object framework
     */
    var QF = {
        subscribes: {},

        activeObjects: [],

        timeEvents: [],

        timerId: 0,

        tickRate: QF_TICK_RATE,

        init: function(tick) {
            QF.subscribes = {};
            QF.activeObjects = [];
            QF.timeEvents = [];

            if (!Y.Lang.isNumber(tick)) {
                QF.tickRate = QF_TICK_RATE;
            } else {
                QF.tickRate = tick;
            }

            QF.timerId = 0;
        },

        run: function() {
            QF.onStartup();
            QF.timerId = setInterval(QF.tick, QF.tickRate);
        },

        startActive: function(ao, priority) {
            if (indexOf(QF.activeObjects, ao) === -1) {
                ao.priority = priority;
                QF.activeObjects.push(ao);
                QF.activeObjects.sort(function(a, b) {
                    return a.priority - b.priority;
                });
                ao.init(null);
            }
        },

        stopActive: function(ao) {
            var pos = indexOf(QF.activeObjects, ao);
            if (pos !== -1) {
                QF.activeObjects.splice(pos, 1);
            }
        },

        arm: function(te, interval, repeat) {
            if (indexOf(QF.timeEvents, te) === -1) {
                te.interval = interval;
                te.repeat = repeat;
                te.lastTick = Date.now();
                QF.timeEvents.push(te);
            }
        },

        disarm: function(te) {
            var pos = indexOf(QF.timeEvents, te);
            if (pos !== -1) {
                QF.timeEvents.splice(pos, 1);
            }
        },

        subscribe: function(ao, signal) {
            var subs = QF.subscribes[signal];
            if (!subs) {
                QF.subscribes[signal] = [];
                subs = QF.subscribes[signal];
            }

            if (indexOf(subs, ao) === -1) {
                subs.push(ao);
            }
        },

        unsubscribe: function(ao, signal) {
            var subs = QF.subscribes[signal],
                pos = 0;

            if (!subs) {
                return;
            }

            pos = indexOf(subs, ao);
            if (pos !== -1) {
                subs.splice(pos, 1);
            }
        },

        unsubscribeAll: function(ao) {
            var pos = 0,
                p,
                subs = [];

            for (p in QF.subscribes) {
                if (QF.subscribes.hasOwnProperty(p) &&
                    QF.subscribes[p] instanceof Array ) {
                    subs = QF.subscribes[p];
                    pos = indexOf(subs, ao);
                    if (pos !== -1) {
                        subs.splice(pos, 1);
                    }
                }
            }
        },

        publish: function(e) {
            var i = 0,
                length = 0,
                subs = QF.subscribes[e.signal];

            if (!subs) {
                return;
            }

            for (i = 0, length = subs.length; i < length; i++) {
                subs[i].postFifo(e);
            }
        },

        tick: function() {
            var i = 0,
                length = QF.timeEvents.length,
                te = null,
                timeNow = Date.now();

            for (i = length - 1; i >= 0; i--) {
                te = QF.timeEvents[i];
                if ((timeNow - te.lastTick) >= te.interval) {
                    te.activeObject.postFifo(new QEvent(te.signal, null, te.activeObject));
                    if (te.repeat) {
                        te.lastTick = timeNow;
                    } else {
                        QF.timeEvents.splice(i, 1);	// remove
                    }
                }
            }
        },

        onStartup: function() {
            console.log('QF Startup!');
        },

        stop: function() {
            QF.onCleanup();
            clearInterval(QF.timerId);
        },

        onCleanup: function() {
            console.log('QF Cleanup');
        }
    };

    Y.yqf.QF = QF;
    Y.yqf.QState = QState;
    Y.yqf.QHsm = QHsm;
    Y.yqf.QActive = QActive;
    Y.yqf.QEvent = QEvent;
    Y.yqf.QTimeEvent = QTimeEvent;
}, '0.0.1', ['base']);