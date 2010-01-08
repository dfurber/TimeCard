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
		$.ajax({
			url: app.url + "/time_entries/report.xml",
			data: {
				from: app.date.getStart(), 
				to: app.date.getEnd(), 
				subject_id: app.user.id
			},
			format:'xml',
			type:'GET',
			//async:false,
			cache:false,
			success: function(root) {
				$(root).find("time-entry").each(function(){
					self.entries.push(new TimeEntry(this, self)); 
				});
				self.render();
				app.statusBar.clear();
				app.tabs.unblock();
				$('.loadindicator').hide();
			},
			error: function(){
				app.statusBar.set("There was an error loading the time entries");	
				app.tabs.unblock();
				$('.loadindicator').hide();
			},
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
	},
	create : function(){
		$('#add_time').block({message: null});
		var self = this,
			hours = $('#hours'),
			project = $('#time_entry_project_id'),
			errors,
			date,
			date_orig,
			opts = $.extend(app.ajaxOptions, {type: "POST", processData: false});
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
			if ($('#todos').val()) 
				opts.url = app.url + "/todo_items/" + $('#todos').val() + "/time_entries.xml";
			else 
				opts.url = app.url + "/projects/" + $('#time_entry_project_id').val() + "/time_entries.xml";

			opts.complete = function(response){
				if (response.status == 201){
					var id = response.getResponseHeader("Location").split("/");
					id = id[id.length - 1];
					time_entry.id = id;
					var tr = $(time_entry.toHtml());
					$('#timesheet').prepend(tr);
					$("span.todo_id", tr).each(app.addTodoLink);
					$("td", tr).effect("highlight");
					self.calculateTotalHours();
					$('#description,#hours').val('');
					//app.clock.countdown("destroy");
					self.entries.push(time_entry);
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
		//td.append("<a href=\"#\" class=\"edit\"><img alt=\"Edit\" src=\"resources/pencil.png\" title=\"Edit\" /></a>");
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
		return row;
	},
	toXml : function(){
		var date = this.date.split("/");
		date = date[2] + "-" + app.date.zeroPad(date[0]) + "-" + app.date.zeroPad(date[1]);

		var data = '<time-entry>';
		data += '<person-id>'+this.person_id +'</person-id>';
		data += '<date>' + date + '</date>';
		data += '<hours>' + this.hours + '</hours>';
		data += '<description>' + this.description + '</description>';
		data += '</time-entry>';
		return data;
	},
	edit : function() {
		var form = document.createElement("TR");
		form.id = "edit_" + this.id;
		form.className = "edit_form";
		var row = $('#entry_' + this.id);
		var date = $('span.date', row).html(),
			description = $('td.description span.text', row).html(),
			hours = $('td.hours', row).html(),
			project = $('td.project', row).html()
			
		var html = "<td class='date'><input type='text' class='datepicker' name='time_entry[date]' value='" + date + "' /></td>";
		html += "<td class='project'>" + project + "</td>";
		html += "<td class='description'><input type='text' name='time_entry[description]' value='" + description + "' /></td>";
		html += "<td class='hours'><input type='text' name='time_entry[hours]' value='" + hours + "' /></td>";
		html += "<td class='actions'><button class='save' type='submit'>Save</button><button id='canceledit" + this.id + "' class='cancel'>Cancel</button></td>";
		var self = this;
		$(form).html(html).find("button.cancel").bind("click", function(){self.cancelEdit()});
		$('#entry_' + this.id).hide().before(form);
		$('tr.edit_form input.datepicker').datepicker();
		return false;
	},
	cancelEdit: function() {
		$('#edit_' + this.id).remove();
		$('#entry_' + this.id).show();
		return false;
	},
	destroy: function(){
		var self = this;
		$('#entry' + this.id).block();
		opts = $.extend(app.ajaxOptions, {
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
		$.ajax(opts);
		return false;
	},		
	update : function() {
		$('tr.edit_form').block();
		var errors,
			description = $('tr.edit_form td.description input').val(),
			date = $('tr.edit_form td.date input').val(),
			hours = $('tr.edit_form td.hours input').val(),
			opts = $.extend(app.ajaxOptions, {type: "put", processData: false});
			
		if (!description) {
			$('tr.edit_form td.description input').addClass("error");
			errors = true;
		}
		if (!date) {
			$('tr.edit_form td.date input').addClass("error");
			errors = true;
		}
		if (!hours) {
			$('tr.edit_form td.hours input').addClass("error");
			errors = true;
		}
			
		if (errors) {
			$('tr.edit_form').unblock();
			return;
		}
			
		this.date = date;
		this.hours = hours;
		this.description = description;
		opts.data = this.toXml(); 
		
		opts.url = app.url + "/time_entries/" + this.id + ".xml";
		
		var self = this;
		opts.complete = function(response){
		   	if (response.status == 200){
				$('tr.edit_form').unblock().remove();
				var row = $('#entry_' + self.id);
				$('td.date', row).html(app.date.convert(self.date).format('l n/j'));
				$('td.description span.text', row).html(self.description);
				$('td.hours', row).html(self.hours);
				$('span.date').html(self.date);
				self.parent.calculateTotalHours();
				row.show();
				$("td", row).effect("highlight");
	   		} else {
				$('tr.edit_form').unblock();	
			}
		};
		o = opts;
		console.log(o);
		$.ajax(opts);
	}

});