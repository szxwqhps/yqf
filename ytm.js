/**
 * Created by xiawanqiang on 14-5-1.
 */

YUI.add('ytm', function(Y) {
    var QActive = Y.yqf.QActive,
        QHsm = Y.yqf.QHsm,
        QF = Y.yqf.QF,
        QState = Y.yqf.QState;

    Y.namespace('ytm');

    var TestMachine = function() {
        var self = this,
            foo = false;

        var initial = new QState(function(e) {
            Y.log('In initial.');
            foo = false;
            Y.log('Transfer to s2');
            return self.transfer(s2);
        });

        var terminate = new QState(QHsm.handled, QHsm.top, function() {
            Y.log('In terminate.');
            QF.stopActive(self);	// remove from QF
        });

        var s = new QState(function(e) {
            switch (e.signal) {
                case 'tm:e':
                    Y.log('s - e');
                    Y.log('Transfer to s11');
                    return self.transfer(s11);
                case 'tm:terminate':
                    Y.log('s - terminate');
                    Y.log('Transfer to terminate');
                    return self.transfer(terminate);
            }

            return QHsm.unhandled();
        }, QHsm.top, function() {
            Y.log('Enter s.');
        }, function() {
            Y.log('Exit s.');
        }, function() {
            Y.log('Init s.');
            if (foo) {
                foo = false;
                Y.log('Transfer to s11');
                return self.transfer(s11);
            }
            return QHsm.handled();
        });

        var s1 = new QState(function(e) {
            switch (e.signal) {
                case 'tm:b':
                    Y.log('s1 - b');
                    Y.log('Transfer to s11');
                    return self.transfer(s11);
                case 'tm:d':
                    if (!foo) {
                        Y.log('s1 - d');
                        foo = true;
                        Y.log('Transfer to s');
                        return self.transfer(s);
                    }
                    return QHsm.unhandled();
                case 'tm:c':
                    Y.log('s1 - c');
                    Y.log('Transfer to s2');
                    return self.transfer(s2);
                case 'tm:a':
                    Y.log('s1 - a');
                    Y.log('Self transfer to s1');
                    return self.transfer(s1);
                case 'tm:f':
                    Y.log('s1 - f');
                    Y.log('Transfer to s211');
                    return self.transfer(s211);
            }

            return QHsm.unhandled();
        }, s, function() {
            Y.log('Enter s1.');
        }, function() {
            Y.log('Exit s1.');
        }, function() {
            Y.log('Init s1.');
            Y.log('Transfer to s11');
            return self.transfer(s11);
        });

        var s11 = new QState(function(e) {
            switch (e.signal) {
                case 'tm:d':
                    if (foo) {
                        Y.log('s11 - d');
                        Y.log('Transfer to s1');
                        foo = false;
                        return self.transfer(s1);
                    }
                    return QHsm.unhandled();
                case 'tm:h':
                    Y.log('s11 - h');
                    Y.log('Transfer to s');
                    return self.transfer(s);
                case 'tm:g':
                    Y.log('s11 - g');
                    Y.log('Transfer to s211');
                    return self.transfer(s211);
            }

            return QHsm.unhandled();
        }, s1, function() {
            Y.log('Enter s11.');
        }, function() {
            Y.log('Exit s11.');
        });

        var s2 = new QState(function(e) {
            switch (e.signal) {
                case 'tm:c':
                    Y.log('s2 - c');
                    Y.log('Transfer to s1');
                    return self.transfer(s1);
                case 'tm:f':
                    Y.log('s2 - f');
                    Y.log('Transfer to s11');
                    return self.transfer(s11);
            }

            return QHsm.unhandled();
        }, s, function() {
            Y.log('Enter s2.');
        }, function() {
            Y.log('Exit s2.');
        }, function() {
            Y.log('Init s2.');
            if (!foo) {
                foo = true;
                Y.log('Transfer to s211');
                return self.transfer(s211);
            }
            return QHsm.handled();
        });

        var s21 = new QState(function(e) {
            switch (e.signal) {
                case 'tm:a':
                    Y.log('s21 - a');
                    Y.log('Self transfer to s21');
                    return self.transfer(s21);
                case 'tm:g':
                    Y.log('s21 - g');
                    Y.log('Transfer to s11');
                    return self.transfer(s11);
                case 'tm:b':
                    Y.log('s21 - b');
                    Y.log('Transfer to s211');
                    return self.transfer(s211);
            }

            return QHsm.unhandled();
        }, s2, function() {
            Y.log('Enter s21.');
        }, function() {
            Y.log('Exit s21.');
        }, function() {
            Y.log('Init s21.');
            Y.log('Transfer to s211');
            return self.transfer(s211);
        });

        var s211 = new QState(function(e) {
            switch (e.signal) {
                case 'tm:d':
                    Y.log('s211 - d');
                    Y.log('Transfer to s21');
                    return self.transfer(s21);
                case 'tm:h':
                    Y.log('s211 - h');
                    Y.log('Transfer to s');
                    return self.transfer(s);
            }

            return QHsm.unhandled();
        }, s21, function() {
            Y.log('Enter s211.');
        }, function() {
            Y.log('Exit s211.');
        });

        QActive.call(self, initial);
    };

    Y.extend(TestMachine, QActive);

    Y.ytm.TestMachine = TestMachine;
}, '0.0.1', ['base', 'yqf']);