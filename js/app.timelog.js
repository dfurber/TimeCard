var TimeLog = Class.create({
	init: function(){
		this.table = $('#timesheet');
		this.setDateRange();
	},
	// This is tells how many weeks to push the time back for the time log
	dateSubtractor: 0,
	setDateRange: function(){
		var d = new Date(), e = new Date();
		var t = d.getTime();
		var days = d.getDay() - 1 - this.dateSubtractor * 7;
		var m = 24 * 3600 * 1000;
		this.startDate = new Date((new Date()).setTime(t - days * m));
		this.endDate = new Date((new Date()).setTime(t + (6 - days) * m));
	},
	jumpAhead: function(){
		this.dateSubtractor += 1;
		if (this.dateSubtrator < 0)
			this.dateSubtrator = 0;
		this.setDateRange();
		$('#time_entry_date').val(this.startDate.format('m/d/Y'));
		this.load();
	},
	jumpBack: function(){
		this.dateSubtractor -= 1;
		this.setDateRange();
		$('#time_entry_date').val(this.startDate.format('m/d/Y'));
		this.load();
	},
	showThisWeek: function(){
		this.dateSubtractor = 0;
		this.setDateRange();
		$('#time_entry_date').val(new Date().format('m/d/Y'));
		this.load();
	},
	sort: function(a,b){
        a = new Date(a.date); b = new Date(b.date);
        if (a>b) return -1;
        if (a <b) return 1;
        return 0; 
	},
	refresh: function(){
	  $('#timesheet tbody').html('');
	  this.load();  
	  //this.calculateTotalHours();
	},

	load : function(){
		//air.Introspector.Console.log('loading time entries')
		app.statusBar.set("Fetching time entries");
		app.tabs.block();
		app.buildIdentityBox();
		this.entries = [];
		var self = this;
		app.connection.request({
			url: "/time_entries/report.xml",
			data: {
				from: app.date.getStart(), 
				to: app.date.getEnd(), 
				subject_id: app.user.id
			},
			success: function(root) {
				$(root).find("time-entry").each(function(){
					self.entries.push(new TimeEntry(this, self)); 
				});
				self.entries.sort(self.sort);
				self.render();
				app.statusBar.clear();
				app.tabs.unblock();
				$('.loadindicator').hide();
			},
			error: function(){
				app.statusBar.set("There was an error loading the time entries");	
				app.tabs.unblock();
				$('.loadindicator').hide();
			}
		});
	},
	render: function(){
		var self = this;
		this.table.html('');
		$(this.entries).each(function(){
		   self.table.append(this.toHtml()); 
		});
		$("span.todo_id").each(app.addTodoLink);
		this.calculateTotalHours();
		app.buildProjectDropdown();
		$('#container').removeClass("loading");
		app.fitLayout();
	},
	create : function(){
	    console.log('starting to add time entry to basecamp');
		$('#add_time').block({message: "Sending time entry to Basecamp..."});
		var self = this,
			hours = $('#hours'),
			project = $('#time_entry_project_id'),
			errors,
			date,
			date_orig,
            opts = $.extend({}, app.ajaxOptions);
		opts.type = "POST";
		opts.processData = false;
		if (!hours.val()) {
			hours.addClass("error");
			errors = true;
		} else {
			var date_orig = $('#time_entry_date').val()
		}
		if (!project.val()) {
			project.addClass("error");
			errors = true
		} 
		if (!errors) {
			hours.removeClass("error");
			project.removeClass("error");
			
			var time_entry = new TimeEntry({
				id: null,
				person_id: app.user.id,
				date: date_orig,
				hours: hours.val(),
				description: $('#description').val(),
				project_id: $('#time_entry_project_id').val(),
				todo_id: $('#todos').val()
			}, self);
				
			opts.data = time_entry.toXml();
			console.log('prepared time entry data');
			if ($('#todos').val()) 
				opts.url = app.url + "/todo_items/" + $('#todos').val() + "/time_entries.xml";
			else 
				opts.url = app.url + "/projects/" + $('#time_entry_project_id').val() + "/time_entries.xml";
			opts.complete = function(response){
				if (response.status == 201){
				    console.log('successfully completed request to post time');
					var id = response.getResponseHeader("Location").split("/");
					id = id[id.length - 1];
					time_entry.id = id;
					var tr = $(time_entry.toHtml());
					$('#timesheet').prepend(tr);
					console.log('about to add todo link');
					$("span.todo_id", tr).each(app.addTodoLink);
					console.log('added todo link');
					$("td", tr).effect("highlight");
					self.calculateTotalHours();
					$('#description,#hours').val('');
					//app.clock.countdown("destroy");
					self.entries.push(time_entry);
					console.log('processed the response from basecamp');
				}
				$('#add_time').unblock();
			};
			$.ajax(opts);
			
		} else {
			$('#add_time').unblock();
		}
		return false;
	},
	calculateTotalHours : function(){
		var hours = 0;
		$('#timesheet td.hours').each(function(){
			hours += parseFloat($(this).html());
		});
		$('.total_hours').html(hours);
		$('#summary').show();
	},
	submitEdit : function(){
		var id = $('tr.edit_form').attr("id").replace("edit_", "");
		$(this.entries).each(function(){
			if (this.id == id)
				this.update();
		});
		return false;
	}
});

TimeEntry = Class.create({
	init: function(data, parent){
		this.parent = parent;
		if (!parent) alert("Can't create time entry without passing in timelog object");
		if (typeof(data.addEventListener) == 'undefined'){
			this.id = data.id;
			this.person_id = data.person_id;
			this.date = data.date;
			this.hours = data.hours;
			this.description = data.description;
			this.project_id = data.project_id;
			this.todo_id = data.todo_id;
		} else {
			this.id = $(data).find("id").text();
			this.project_id = $(data).find("project-id").text();
			this.person_id = $(data).find("person-id").text();
			this.date = $(data).find("date").text();
			this.hours = $(data).find("hours").text();
			this.description = $(data).find("description").text();
			this.todo_id = $(data).find("todo-item-id").text();  
			
			this.date = this.date.split("-");
			this.date = this.date[1] + "/" + this.date[2] + "/" + this.date[0];
		}
	},
	toHtml : function(){
		var row = $("<tr></tr>");
		row.attr("id", "entry_" + this.id);
		row.append("<td class=\"date\">" + app.date.convert(this.date).format('l n/j') + "</td>");
		var project = app.getProjectById(this.project_id);
		row.append("<td class=\"project\">" + project.company_name + "<br />" + project.name + "</td>");
		row.append("<td class=\"description\"><span class=\"text\">" + (this.description || "") + "</span></td>");
		row.append("<td class=\"hours\">" + this.hours + "</td>");
		var td = $("<td></td>");
		td.addClass("actions");
		td.append("<a href=\"#\" class=\"edit\"><img alt=\"Edit\" src=\"resources/pencil.png\" title=\"Edit\" /></a>");
		td.append("<a href=\"#\" class=\"delete\"><img alt=\"Delete\" src=\"resources/delete.png\" title=\"Delete\" /></a>");
		td.append("<span class=\"date\" style=\"display:none;\">" + this.date + "</span>");
		td.append("<span class=\"todo_id\" style=\"display:none;\">" + this.todo_id + "</span>");
			
		// if there is a todo id but we don't have it, we should get it
		if (this.todo_id && typeof app.todo_items[this.todo_id] == "undefined") {
			//air.Introspector.Console.log('didnt find a todo, so sending out for it');
			app.findTodoItem(this.todo_id);	
		}
		var self = this;
		td.find("a.edit").bind("click", function(){self.edit()});
		td.find("a.delete").bind("click", function(){self.destroy()});
		row.append(td);
		this.dom = row;
		return row;
	},
	dateToBasecamp : function() {
		var date = this.date.split("/");
		return date[2] + "-" + app.date.zeroPad(date[0]) + "-" + app.date.zeroPad(date[1]);
	},
	toXml : function(){
		var data = '<time-entry>';
		data += '<person-id>'+this.person_id +'</person-id>';
		data += '<date>' + this.dateToBasecamp() + '</date>';
		data += '<hours>' + this.hours + '</hours>';
		data += '<description>' + this.description + '</description>';
		data += '</time-entry>';
		return data;
	},
	toPostData : function(){
	    var date = this.dateToBasecamp();
		return {
			"_method" : "put",
			"commit" : "Save",
			"time_entry[description]" : this.description,
			"time_entry[date(1i)]" : date.substring(0,4),
			"time_entry[date(2i)]" : (date[5] == "0" ? "" : date[5]) + date[6],
			"time_entry[date(3i)]" : (date[8] == "0" ? "" : date[8]) + date[9],
			"time_entry[hours]" : this.hours,
			"time_entry[person_id]" : this.person_id,
			"time_entry[todo_item_id]" : this.todo_id
		}
	},
	edit : function() {
		this.form = $("<tr class='edit_form' id='edit_" + this.id + "'></tr>");
		var date = $('span.date', this.dom).html(),
			description = $('td.description span.text', this.dom).html(),
			hours = $('td.hours', this.dom).html(),
			project = $('td.project', this.dom).html()

		var html = "<td class='date'><input type='text' class='datepicker' name='time_entry[date]' value='" + date + "' /></td>";
		html += "<td class='project'>" + project + "</td>";
		html += "<td class='description'>";
		html += "<span class='todo'><select class='todos' name='time_entry[todo_item_id]'>" + app.getTodoOptions(this.project_id) + "</select></span>";
		html += "<input type='text' name='time_entry[description]' value='" + description + "' /></td>";
		html += "<td class='hours'><input type='text' name='time_entry[hours]' value='" + hours + "' /></td>";
		html += "<td class='actions'><button class='save' title='Save Changes'>Save</button><button id='canceledit" + this.id + "' class='cancel' title='Cancel Edit'>Cancel</button></td>";
		var self = this;
		this.form.html(html).find("button.cancel").bind("click", this, this.cancelEdit);
		this.form.find('button.save').bind('click', this, this.update);
		if (this.todo_id) {
		    this.form.find("select.todos").val(this.todo_id);
		}
		this.dom.hide().before(this.form);
		this.form.find('input.datepicker').datepicker();
		this.form.find('select.todos').bind("change", app.checkForNewTodo);
		$('select.todos:value[new]').val('').show();
		$('#new_todo_form').remove();
		return false;
	},
	cancelEdit: function(e) {
	    e.data.form.remove();
	    e.data.dom.show();
		return false;
	},
	destroy: function(){
		var self = this;
		this.dom.block({message: "Removing entry from Basecamp..."});
        var opts = $.extend({}, app.ajaxOptions);
		$.extend(opts, {
			type: 'DELETE', 
			processData: false,
			url: app.url + "/time_entries/" + this.id + ".xml",
			complete: function(response){
				if (response.status == 200) {
					$('#entry_' + self.id).unblock().remove();
					// console.log(self);
					self.parent.calculateTotalHours();
				} else {
					$('#entry_' + self.id).unblock();
				}
			}
		});
		console.log(opts);
		$.ajax(opts);
		return false;
	},		
	update : function(e) {
	    var self = e.data;
		self.form.block({message: "Sending updated entry to Basecamp..."});
		var errors,
			description = self.form.find('td.description input').val(),
			date = self.form.find('td.date input').val(),
			hours = self.form.find('td.hours input').val(),
			todo_id = self.form.find('td.description select').val(),
			opts = {};
    		
		if (!description) {
			self.form.find('td.description input').addClass("error");
			errors = true;
		}
		if (!date) {
			self.form.find('td.date input').addClass("error");
			errors = true;
		}
		if (!hours) {
			self.form.find('td.hours input').addClass("error");
			errors = true;
		}
			
		if (errors) {
			self.form.unblock();
			return;
		}
		
		if ((self.date == date) && (self.hours == hours) && (self.description == description) && (self.todo_id == todo_id)) {
		    self.form.unblock()
		    self.form.remove();
		    self.dom.show();
		    return;
		}
		
		self.date = date;
		self.hours = hours;
		self.description = description;
		self.todo_id = todo_id;
		
        var url = app.url + "/time_entries/" + self.id + ".xml";
        var successful = false;  

        app.connection.request({
            url: "/time_entries/" + self.id + ".xml",
            data: self.toXml(),
            type: "PUT",
            complete: function(){
                if (app.connection.successful) {
        			self.form.unblock().remove();
        			self.dom.find('td.date').html(app.date.convert(self.date).format('l n/j'));
        			self.dom.find('td.description span.text').html(self.description);
        			self.dom.find('td.hours').html(self.hours);
        			self.dom.find('span.date').html(self.date);
                    var todo = self.dom.find('span.todo')
        			if (self.todo_id) {
        			    if (todo.size() > 0)
        			        todo.html(app.todo_items[self.todo_id].name);
        			    else {
        			        self.dom.find('td.description').prepend("<span class='todo'>" + app.todo_items[self.todo_id].name + "</span>");
        			    }
        			} else {
        			    todo.remove();
        			}
        			self.dom.find('span.todo_id').html(self.todo_id);
        			self.parent.calculateTotalHours();
        			self.dom.show();
        			self.dom.find("td").effect("highlight");
                } else {
                    self.form.unblock();
                }
            }
    	});
        // loader.load(request);
        		
		// console.log(opts);
		// $.ajax(opts);
	}

});