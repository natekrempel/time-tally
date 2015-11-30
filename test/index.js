var expect = require('chai').expect,
    TimeTally = require('../index');

describe('Init', function(){
    it('get the git user email', function(){
        var timer = new TimeTally('user@user.com', 'package');
        expect(timer.user).to.equal('user@user.com');
    });

    it('get the package name', function(){
        var timer = new TimeTally('user@user.com', 'package');
        expect(timer.packageName).to.equal('package');
    });

});

describe('Start Timer', function(){
    it('create new db log entry',function(done){
        var timer = new TimeTally('user@user.com', 'package');

        timer.db = {
            insert: function(document, cb) {
                cb(null);
            }
        };

        timer.startTimer(function(err) {
            expect(err).to.equal(null);
            done();
        });
    });

    it('creates an error when inserting the document ',function(done){
        var timer = new TimeTally('user@user.com', 'package');

        timer.db = {
            insert: function(document, cb) {
                cb(new Error());
            }
        };

        timer.startTimer(function(err) {
            expect(err).to.not.equal(null);
            // timer.destroy();
            done();
        });
    });
});

describe('End Timer', function(){
    it('gets the current start time', function(done) {
        var timer = new TimeTally('user@user.com', 'package'),
            docs = [
                {
                    'projectName':'GulpTimer',
                    'startTime':{'$$date':1447273037258},
                    '_id':'0I615GbqyUkWO2ci',
                    'createdAt':{'$$date':1447273037271},
                    'updatedAt':{'$$date':1447273253348},
                    'endTime':{'$$date':1447273253340},
                    'duration':216082
                }
            ];

        timer.db = {
            find: function(query, cb) {
                cb(null,docs);
            }
        };

        timer.getStartTime(function(cb,res){
            expect(cb).to.equal(null);
            expect(res._i.$$date).to.equal(1447273037258);
            done();
        });
    });

    it('errors while getting the start time', function(done) {
        var timer = new TimeTally('user@user.com', 'package'),
            docs = [
                {
                    'projectName':'GulpTimer',
                    'startTime':{'$$date':1447273037258},
                    '_id':'0I615GbqyUkWO2ci',
                    'createdAt':{'$$date':1447273037271},
                    'updatedAt':{'$$date':1447273253348},
                    'endTime':{'$$date':1447273253340},
                    'duration':216082
                }
            ];

        timer.db = {
            find: function(query, cb) {
                cb(new Error(),docs);
            }
        };

        timer.getStartTime(function(cb){
            expect(cb).to.not.equal(null);
            done();
        });
    });

    it('updates the endTime in the log', function(done) {
        var timer = new TimeTally('user@user.com', 'package'),
            start = 1447273037258;

        timer.db = {
            update: function(query, update, options, cb) {
                cb(null);
            }
        };

        timer.calcEndLog = function(){
            return {
                endTime: start - 2000,
                duration: 2000
            };
        };

        timer.updateEndTime(start, function(cb, total) {
            expect(cb).to.equal(null);
            expect(total).to.equal(2000);
            done();
        });

    });

    it('errors when updating the endTime in the log', function(done){
        var timer = new TimeTally('user@user.com', 'package'),
            start = 1447273037258;

        timer.db = {
            update: function(query, update, options, cb) {
                cb(new Error());
            }
        };

        timer.updateEndTime(start, function(cb) {
            expect(cb).to.not.equal(null);
            done();
        });
    });
});

describe('Calculate End Time Log Entry', function(){
    it('returns an object with the end and duration', function(done) {
        var timer = new TimeTally('user@user.com', 'package'),
            startLog = 1447273037258,
            currentDate = startLog + 5000;

        var testEndLogCalc = timer.calcEndLog(currentDate, startLog);

        expect(testEndLogCalc.endTime).to.equal(currentDate);
        expect(testEndLogCalc.duration).to.equal(5000);

        done();
    });
});

// Do I need to create a mock set of the data "from" the nedb json file to test the totaling functions?

describe('Return total', function(){
    it('log total time from logs', function(done){
        var timer = new TimeTally('user@user.com', 'package');

        timer.total(function(cb) {
            expect(cb).to.equal(null);
            done();
        });
    });
});

describe('Return todays total', function(){
    it('log todays total form logs', function(done){
        var timer = new TimeTally('user@user.com', 'package');

        timer.dayTotal(function(cb) {
            expect(cb).to.equal(null);
            done();
        });
    });
});
