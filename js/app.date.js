// These are utility date functions now, want to integrate with time entry log more...
$.extend(app, { 
	date : {
		convert: function(date){
			var parts, d = new Date();
			if (date.indexOf("-") != -1){
				parts = date.split("-");
				d.setYear(parts[0]);
				d.setMonth(parts[1] - 1);
				d.setDate(parts[2]);
			} else {
				parts = date.split("/");
				d.setYear(parts[2]);
				d.setMonth(parts[0] - 1);
				d.setDate(parts[1]);
			}
			return d;
		},
		zeroPad: function(item){
			return ((item + 0) < 10) ? "0" + item : item
		},
		format: function(date){
			var year = date.getFullYear(),
				month = date.getMonth() + 1,
				day = date.getDate();
			month = app.date.zeroPad(month) + "";
			day = app.date.zeroPad(day) + "";
			return year + month + day + "";
			
		},
		// return YYYYMMDD for Basecamp.start_date
		getStart: function(){
			return app.date.format(app.timelog.startDate);
		},
		getEnd: function(){
			return app.date.format(app.timelog.endDate);
		}
	}
});