var moment = require('moment'),
    Datastore = require('nedb');

/**
 * Tally up how long you work on a project with a simple gulp tasks
 * @class
 */
function TimeTally(user, packageName) {
    this.user = user;
    this.packageName = packageName;

    this.db = new Datastore({
        filename: './time-logs/'+user+'.json',
        timestampData: true
    });

    this.db.loadDatabase();

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
        'projectName': this.packageName,
        'startTime': new Date()
    };

    this.db.insert(newLog, function(err){
        console.log(' ===== START TIMER =====');
        cb(err);
    });
};

/**
 * Stop the timer / add the current time and total duration for the last log
 * @memberOf TimeTally
 */
TimeTally.prototype.endTimer = function () {
    // this.getStartTime(this.updateEndTime.bind(this));

    this.getStartTime(function(err, start){
        if(err) {
            console.error('Error getting the start time for the current timer - ', err);
            return;
        }

        this.updateEndTime(start,function(err, total){
            if(err) {
                console.error('Error updating the endTime field in the current timer log - ', err);
                return;
            }

            this.logDuration(total);
            process.exit();

        }.bind(this));

    }.bind(this));

};

TimeTally.prototype.getStartTime = function (cb) {
    this.db.find({
        endTime: {$exists: false}
    }, function(err, docs){
        var start = moment(docs[0].startTime);
        if (err) return cb(err);
        cb(null, start);
    });
};

TimeTally.prototype.updateEndTime = function(start, cb) {

    var endTimeLog = this.calcEndLog(new Date(), start);

    this.db.update({
        endTime: {$exists: false}
    },{
        $set: endTimeLog
    },{},function(err){
        console.log(' ===== END TIMER =====');
        if(err) return cb(err);
        cb(null, endTimeLog.duration);
    });
};

TimeTally.prototype.calcEndLog = function (currentTime,startTime) {
    var end = moment(currentTime),
        total = end.diff(startTime),
        endTimeLog = {
            endTime: currentTime,
            duration: total
        };

    return endTimeLog;
};

TimeTally.prototype.logDuration = function(total) {
    var duration = moment.duration(total)._data;
    console.log(duration.hours+'hrs', duration.minutes+'min', duration.seconds+'s');
};

TimeTally.prototype.combineDocs = function (docs) {
    var total = 0,
        i;
    for (i = 0; i < docs.length; i++) {
        total += docs[i].duration;
    }

    this.logDuration(total);
};

/**
 * Log out to the CLI the total of all duration fields for the project
 * @memberOf TimeTally
 */
TimeTally.prototype.total = function (cb) {
    this.db.loadDatabase();
    this.db.find({
        duration: {$exists: true}
    }, function(err, docs){
        if(err) return cb(err);
        this.combineDocs(docs);
        cb();

    }.bind(this));
};

/**
 * Log out to the CLI the total of all duration fields for the current day
 * @memberOf TimeTally
 */
TimeTally.prototype.dayTotal = function (cb) {
    this.db.loadDatabase();
    this.db.find({
        duration: {$exists: true},
        $where: function(){
            return moment(this.startTime).isSame(new Date(), 'day');
        }
    }, function(err, docs){
        if(err) return cb(err);
        this.combineDocs(docs);
        cb();

    }.bind(this));
};

TimeTally.prototype.destroy = function() {

};

module.exports = TimeTally;
