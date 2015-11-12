var Datastore = require('nedb'),
    fs = require('fs'),
    gitConfig = require('git-config'),
    moment = require('moment'),
    db = {};

/**
 * Tally up how long you work on a project with a simple gulp task
 * @class
 */
function TimeTally() {
    this.user = gitConfig.sync().user.email;
    this.packageName = JSON.parse(fs.readFileSync("./package.json")).name;

    // Set up local datastore for time logs
    db = new Datastore({
        filename: './time-logs/'+this.user+'.json',
        timestampData: true
    });

    db.loadDatabase();

    // Hijack stdin so the program will not close instantly
    process.stdin.resume();

    // Grab ctrl+c event
    process.on('SIGINT', this.endTimer.bind(this));

    // Grab uncaught exceptions
    process.on('uncaughtException', this.endTimer.bind(this));
}

/**
 * Start the timer / create a new log
 * @memberOf TimeTally
 * @callback {function} cb - callback to allow gulp to move onto the next task. This ensures the timer starts first always
 */
TimeTally.prototype.startTimer = function (cb) {
    var newLog = {
        "projectName": this.packageName,
        "startTime": new Date()
    };

    db.insert(newLog, function(){
        console.log(" ===== START TIMER =====");
        cb();
    });
};

/**
 * Stop the timer / add the current time and total duration for the last log
 * @memberOf TimeTally
 * @param {object} err - catches an error if the process is not ended with 'SIGINT' or by a 'uncaughtException'
 */
TimeTally.prototype.endTimer = function (err) {
    var newDate = new Date(),
        end = moment(newDate);

    if (err) console.log(err.stack);

    db.find({endTime: {$exists: false}}, function(err, docs){

        var start = moment(docs[0].startTime),
            total = end.diff(start),
            sessDur = moment.duration(total),
            endTimeLog = {
                endTime: newDate,
                duration: total
            };

        db.update({endTime: {$exists: false}}, {$set: endTimeLog}, {}, function(err, numReplaced, newDoc){
            console.log(" ===== END TIMER =====");
            console.log("Session Duration - "+sessDur._data.hours+"hrs", sessDur._data.minutes+"min", sessDur._data.seconds+"s");
            process.exit();
        });
    });

};

/**
 * Log out to the CLI the total of all duration fields for the project
 * @memberOf TimeTally
 */
TimeTally.prototype.total = function () {
    var total = 0,
        i;

    db.loadDatabase();
    db.find({duration: {$exists: true}}, function(err, docs){

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

/**
 * Log out to the CLI the total of all duration fields for the current day
 * @memberOf TimeTally
 */
TimeTally.prototype.dayTotal = function () {
    var today = new Date(),
        total = 0,
        i;

    db.loadDatabase();
    db.find({
        duration: {$exists: true},
        $where: function(){
            return moment(this.startTime).isSame(new Date(), 'day');
        }
    }, function(err, docs){
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
