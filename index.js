var Datastore = require('nedb'),
    fs = require('fs'),
    gitConfig = require('git-config'),
    moment = require('moment'),
    db = {};

function TimeTally() {
    this.user = gitConfig.sync().user.email;
    this.packageName = JSON.parse(fs.readFileSync("./package.json")).name;
}

TimeTally.prototype.init = function() {

    db = new Datastore({
        filename: './time-logs/'+this.user+'.json',
        timestampData: true
    });

    db.loadDatabase();

    this.startTimer();

    // Hijack stdin so the program will not close instantly
    process.stdin.resume();

    // Grab ctrl+c event
    process.on('SIGINT', this.endTimer.bind(this));

    // Grab uncaught exceptions
    process.on('uncaughtException', this.endTimer.bind(this));

    // Do something when app is closing - Can't think of scenerios when this is needed
    // process.on('exit', this.exitHandler.bind(this,{cleanup:true}));

};

TimeTally.prototype.startTimer = function () {
    console.log(" ===== START TIMER =====");
    // get current time in file and append to it

    var newLog = {
            "projectName": this.packageName,
            "startTime": new Date()
        };

    db.insert(newLog, function(){
        console.log(" ===== NEW LOG ADDED =====");
    });
};

TimeTally.prototype.endTimer = function (err) {
    console.log(" ===== END TIMER =====");
    var newDate = new Date();
    if (err) console.log(err.stack);
    db.find({endDate: {$exists: false}}, function(err, docs){
        var start = moment(docs[0].startTime),
            end = moment(newDate),
            total = end.diff(start),
            sessionDuration = moment.duration(total);

        db.update({endDate: {$exists: false}}, {$set: {endDate: newDate, duration: total}}, {}, function(err, numReplaced, newDoc){
            console.log("Session Duration - ");
            console.log(sessionDuration._data.hours+"hrs", sessionDuration._data.minutes+"min", sessionDuration._data.seconds+"s");
            process.exit();
        });
    });

};

TimeTally.prototype.total = function () {
    db.loadDatabase();

    db.find({duration: {$exists: true}}, function(err, docs){
        var total = 0,
            i;
        for (i = 0; i < docs.length; i++) {
            console.log(docs[i]._id, moment.duration(docs[i].duration)._data.hours);
            total += docs[i].duration;
        }
        total = moment.duration(total);
        // Log out Time for the entirety of the project
        console.log(total._data.hours+"hrs", total._data.minutes+"min", total._data.seconds+"s");
        process.exit();
    });
};

TimeTally.prototype.dayTotal = function () {
    db.loadDatabase();

    var currentDate = moment().toDate().toJSON();
    db.find({duration: {$exists: true}, $where: function(){ return moment(this.startTime).isSame(new Date(), 'day');}}, function(err, docs){
        var total = 0,
            i;

        for (i = 0; i < docs.length; i++) {
            total += docs[i].duration;
        }

        total = moment.duration(total);
        // Log out Time for the day
        console.log(total._data.hours+"hrs", total._data.minutes+"min", total._data.seconds+"s");
        process.exit();
    });
};

module.exports = TimeTally;
