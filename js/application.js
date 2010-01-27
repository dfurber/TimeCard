var base = {
    toJSON : function(key){
        var hash = {}
        for (i in this) 
            if (typeof(this[i]) !== "function")
                hash[i] = this[i];
        return hash;
    }
}

function charSort(a, b){
    a = a.toLowerCase(); b = b.toLowerCase();
    if (a>b) return 1;
    if (a <b) return -1;
    return 0; 
}

var console = {
	log: function(){
		if (typeof(air.Introspector) != "undefined") 
			air.Introspector.Console.log(arguments);
	}
}

AppMenu = Class.create({
	init: function(){
	}
});

var StatusBar = Class.create({
	init: function(){
		this.el = $('#status_bar_elm');
},
	set: function(text){
		this.el.html(text + "...");	
	},
	clear: function(){
		this.el.html('');	
	}
});

var TabControl = Class.create({
	init: function(){
		this.blocked = false;
	},
	setTab: function(tab){
        $('div.tab').hide();
        $('#' + tab).show();
        //$('#tabstrip li.current').removeClass("current");
        //$('#' + tab + "_tab").addClass("current");
    },
	block: function(){
		if (!this.blocked){
			$('#tabs, #tabstrip').block({ message: null });	
			this.blocked = true;
		}
	},
	unblock: function(){
		if (this.blocked){
			$('#tabs, #tabstrip').unblock();
			this.blocked = false;
		}
	}
});

var app = {
	init: function(){
		app.fitLayout();
		$(window).resize(app.fitLayout);
	    app.checkForUpdates();
		app.timelog = new TimeLog();
		app.buildMenu();
		app.statusBar = new StatusBar();
		app.tabs = new TabControl();
   		$(".loadindicator").hide();
    	$(".loadindicator").ajaxStart(function() { $(this).show(); });
    	$(".loadindicator").ajaxStop(function() { $(this).hide(); });
        
        app.clock = $('#timeclock');
       
    	$('#time_entry_project_id').change(app.getTodos);
    	$('#timer').click(app.toggleTimer);
    	$('#pause_timer').click(app.pauseTimer);
    	$('#add_time form').submit(function(){return app.timelog.create();});
    	//$('#timesheet_form').submit(function(){return app.timelog.submitEdit(); });
    	$('.total_hours:first').html($('.total_hours:last').html());
    	$('input.datepicker').datepicker();
    	$('#prefs_submit').bind("click", app.establishConnection);
		$('#reload_link').bind("click", function(){app.reload(); return false;});
		$('#refresh_link').bind("click", function(){app.refreshTime(); return false;});

		$(window).bind("load", this.establishConnection);
	},
    ajaxOptions: {format:'xml', type:'GET',contentType: 'application/xml'},
    projects: [],
    todo_items: {},
    todo_lists: [],
    checkForUpdates : function() {
        app.updater = new runtime.air.update.ApplicationUpdaterUI();
        var appFolder = air.File.applicationDirectory;
        app.updater.configurationFile = appFolder.resolvePath("updaterConfig.xml");
        app.updater.initialize();
    },
	fitLayout : function(){
		$('div.tab').css("height", ($(window).height() - $('#app_top').height() - 45) + "px");
		$('#timesheet_wrapper').css("height", ($('#timelog').height() - $('#add_time').height() + 10) + "px");
	},
	buildMenu: function(){
		if (air.NativeWindow.supportsMenu) {
   			nativeWindow.menu = new air.NativeMenu();
   			targetMenu = nativeWindow.menu;
		}
 
	 	if (air.NativeApplication.supportsMenu) {
		   targetMenu = air.NativeApplication.nativeApplication.menu;
		} 

		var reloadMenu;
		reloadMenu = targetMenu.addItem(new air.NativeMenuItem("Reload"));
		reloadMenu.submenu = new air.NativeMenu();
		newCustomer = reloadMenu.submenu.addItem(new air.NativeMenuItem("Projects, Todos, Time"));
		newCustomer.addEventListener(air.Event.SELECT, app.reload);
		newCustomer = reloadMenu.submenu.addItem(new air.NativeMenuItem("Time Log Only"));
		newCustomer.addEventListener(air.Event.SELECT, function(){app.timelog.refresh()});
		

		var viewMenu = targetMenu.addItem(new air.NativeMenuItem("View"));
		viewMenu.submenu = new air.NativeMenu();
		newItem = viewMenu.submenu.addItem(new air.NativeMenuItem("Back One Week"));
		newItem.addEventListener(air.Event.SELECT, function(){app.timelog.jumpBack()});
		newItem = viewMenu.submenu.addItem(new air.NativeMenuItem("Ahead One Week"));
		newItem.addEventListener(air.Event.SELECT, function(){app.timelog.jumpAhead()});
		newItem = viewMenu.submenu.addItem(new air.NativeMenuItem("This Week"));
		newItem.addEventListener(air.Event.SELECT, function(){app.timelog.showThisWeek()});
		
		var prefsMenu = targetMenu.addItem(new air.NativeMenuItem("Preferences"));
		prefsMenu.submenu = new air.NativeMenu();
		newCustomer = prefsMenu.submenu.addItem(new air.NativeMenuItem("Set Basecamp Account"));
		newCustomer.addEventListener(air.Event.SELECT, function(){app.reset()});
		newCustomer = prefsMenu.submenu.addItem(new air.NativeMenuItem("Check for Updates"));
		newCustomer.addEventListener(air.Event.SELECT, function(){if (app.updater) {app.updater.checkNow();} else { alert("The updater isn't ready yet.");} });

		viewTimelog = viewMenu.submenu.addItem(new air.NativeMenuItem("Time Log"));
		viewTimelog.addEventListener(air.Event.SELECT, function(){app.tabs.setTab("timelog");});

        // viewTodos = viewMenu.submenu.addItem(new air.NativeMenuItem("Todo Lists"));
        // viewTodos.addEventListener(air.Event.SELECT, function(){app.tabs.setTab("todo_lists");});

	},
    establishConnection: function(){
	    // check local storage for url/u/p
        var stored = Cache.get("basecamp_remember_me"), found;
        if (stored){
            url = Cache.get("basecamp_url");
            user = Cache.get("basecamp_user");
            password = Cache.get("basecamp_password");
            found = true;
        } else {
            // read the form
            var url = $('#prefs_url').val(),
                user = $('#prefs_username').val(),
                password = $('#prefs_password').val(),
                remember = $('#prefs_remember_me:checked').size() > 0;
			url = url.replace(/\/$/,''); // remove trailing slash from url
			if (url && user && password) {
                found = true;
                if (remember){
                    Cache.put("basecamp_remember_me", "yes");
                    Cache.put("basecamp_url", url);
                    Cache.put("basecamp_user", user);
                    Cache.put("basecamp_password", password);
                }
            }
        }
		$('#prefs_url, #prefs_username, #prefs_password').val('');
        // if found, set the connection vars, switch tab to time log, and load the user
        // otherwise show the prefs tab - whose submit runs this function
        if (found){

			app.url = url;
			app.username = user;
			app.password = password;
			
			app.ajaxOptions.username = app.username;
			app.ajaxOptions.password = app.password;

			app.statusBar.set("Connecting to Basecamp");
			app.tabs.block();
        	app.connection = new Connection(url, user, password);
			
            app.connection.request({
            // var opts = $.extend(app.ajaxOptions, {
			    type: "GET",
			    url: "/me.xml",
                success: function(personNode) { 
            		//console.log(personNode)
    				app.statusBar.set("Connected to app");
    				app.user = {
            		    id:        parseInt($(personNode).find("person > id").text()),
            		    username:  $(personNode).find("person > user-name").text(),
    					password:  password,
            		    email:     $(personNode).find("person > email-address").text(),
            		    firstname: $(personNode).find("person > first-name").text(),
            		    lastname:  $(personNode).find("person > last-name").text()
            		}
            		app.tabs.setTab("timelog");
        			app.statusBar.set("Fetching projects and todos");
        			app.loadProjects();
            	},
            	error : function(response){
            	    // do something
    				app.tabs.unblock();
    				app.statsBar.set("Unable to authenticate you");
            	    app.tabs.setTab("prefs");
            	    $('#prefs_basecamp_url').focus();
            	}
            	
			});
			//$.ajax(opts);
        	
        } else {
    	    app.tabs.setTab("prefs");
    	    $('#prefs_app.url').focus();
        }
    },
	reset: function(){
	    app.tabs.unblock();
		Cache.reset();
		app.user = null;
		app.todo_items = {};
		app.todo_lists = [];
		app.timelog.entries = [];
		$('#identity').hide();
		app.tabs.setTab("prefs");
   	    $('#prefs_basecamp_url').focus();
	},
    reload : function(){
        $('#container').addClass("loading");
        $('#timesheet tbody').html('');
        $('#todo_list_content').html('');
        Cache.remove("projects");
        Cache.remove("todo_items");
        Cache.remove("todo_lists");
		app.projects = [];
        app.todo_items = {};
        app.todo_lists = [];
        app.timelog.entries = [];
        app.fetchProjects();
    },
    buildIdentityBox: function(){
      $('#identity span.name').html(app.user.firstname + " " + app.user.lastname);
      $('#identity span.start').html(app.timelog.startDate.format('n/j'));
      $('#identity span.end').html(app.timelog.endDate.format('n/j'));  
      $('#identity').show();
    },
    fetchProjects : function(){
        if (app.user){
			app.statusBar.set("Fetching projects and todos");
			app.loadProjects();
            // Project.loadFromCache();
            //             if (app.projects.length < 1){
            //                 console.log('loading projects from basecamp');
            //                 app.loadProjects();
            //             } else {
            //                 console.log('loading projects from cache');
            //                 try {
            //                     TodoList.loadFromCache();
            //                     TodoItem.loadFromCache();
            //                     app.timelog.showThisWeek();                    
            //                 } catch(e) {
            //                     console.log('incomplete data, reloading...', e);
            //                     app.loadProjects();
            //                 }
            //             }
        }
    },
    loadProjects : function(){
        var opts = $.extend({}, app.ajaxOptions);
        // $.extend(opts, {
        //     type: "GET",
        //     cache: false,
        app.connection.request({
            url: "/projects.xml",
            success : function(root){
                console.log('processing projects');
                app.projects = [];
                app.todo_lists = [];
                app.todo_items = [];
                $(root).find("project").each(function(){
                    if ($(this).find("status").text() == "active")
                        app.projects.push(new Project.fromXml(this)); 
                });
                TodoList.load();
                // app.loadTodos();
            },
    		error : function(){
    			app.statusBar.set("Error loading projects");	
    			console.log("error is in loadProjects");
    		}
        });
        //$.ajax(opts);
        //console.log('called loadProjects', opts);
    },
	addTodoLink : function(){
		var text = $(this).html();
		if (text && app.todo_items[text]) {
			//var link = "<a href='" + app.url + "/todolists/" + app.todo_items[text].list + "?time_for=" + text + "#item_" + text + "'>" + app.todo_items[text].name + "</a>";
			$(this).parents("tr").children("td.description").prepend("<span class='todo'>" + app.todo_items[text].name + "</span>");
		}	
	},
	getTodoOptions : function(param){
		var html = "", list_html = "", has_lists = false;
		html += "<option value=''>No Todo for this time entry</option>";
		$(app.todo_lists).each(function(){
			if (this.project_id == param) {
    		    list_html += "<optgroup label=\"" + this.name + "\">";
                has_lists = true;
				$(this.items).each(function(){
					list_html += "<option value='" + this.id + "'>" + this.name + "</option>";
				});
				list_html += "</optgroup>";
			}
		});
		if (has_lists) {
			// until I have "add a new todo list" working, only add if there is an existing list
			html += "<option value='new'>Add a new todo item</option>";
		}
		return html + list_html;
	},
	getTodos: function(){
	    var param = $(this).val();
	    if (!param) {
	        $("#todos_wrapper").hide(); //slideUp("fast", function(){ $(this).remove()});
	    } else {
	        var html = app.getTodoOptions(param);
			if (html.length > 0) {
				$("#todos_wrapper").html("<img src='resources/todo_bug.gif' /><select id='todos' class='todos' name='time_entry[todo_item_id]'>" + html + "</select>");
				$('select.todos').bind("change", app.checkForNewTodo);
			}
	    }
	},
	todoItemToXml : function(item){
		var data = '<todo-item>';
		data += '<content>' + item.content + '</content>';
		data += '<responsible-party>' + app.user.id + '</responsible-party>';
		data += '<notify>true</notify>';
		data += '</todo-item>';
		return data;
	},
	checkForNewTodo: function(){
		if ($(this).val() == "new"){
			// show form to add new todo item
			var newTodo = $("<select id=\"new_todo_lists\"</select>");
			var newTodoName = $("<input type=\"text\" id=\"new_todo_name\" />");
			var project = app.getProjectById($('#time_entry_project_id').val());
			$(project.todo_lists).each(function(){
				newTodo.append("<option value=\"" + this.id + "\">" + this.name + "</option>");
			});
			var newTodoButton = $('<button id="new_todo_button">Add Todo</button>');
			var self = $(this);
		    self.hide().after('<div id="new_todo_form"></div>');
			$('#new_todo_form').append(newTodo).append(newTodoName).append(newTodoButton);
			$('#new_todo_form').append('<button id="new_todo_cancel">Cancel</button>');
			$('#new_todo_cancel').bind("click", function(){
				self.show().val('');
				$('#new_todo_form').remove();
				return false;
			});
			newTodoButton.bind("click", function(){
				var name = newTodoName.val(), 
					list_id = newTodo.val(),
					errors = false;
				if (!list_id) {
					errors = true;
				}
				if (!name) {
					errors = true;
				}
				if (errors) {
					app.statusBar.set("Please fill out the todo item fields!");
				} else {
					// submit the form
					app.statusBar.set("Adding new todo item");
					app.tabs.block({message: null});
					
					// gotta figure out how to get the response header from the 201 response...
					var options = $.extend({}, app.ajaxOptions);
					options.processData = false;
					options.async = false;
					options.cache = false;
					options.type = "POST";
					data = {content: name};
					options.data = app.todoItemToXml(data);
					app.new_todo_item = new TodoItem({name: name, list: list_id});
					options.url = app.url + "/todo_lists/" + list_id + "/todo_items.xml";
					options.complete = app.addNewTodoItem;
					$.ajax(options);
				}
				return false;
			});
		}
	},
	addNewTodoItem: function(response){
		if (response.status == 201){
			var project = app.getProjectById($('#time_entry_project_id').val());
			var id = response.getResponseHeader("Location").split("/");
			var list = null;
			var select = $('#new_todo_form').prev();
	        id = id[id.length - 1];
	        app.new_todo_item.id = id;
			// add the new todo to the project
			for(var i=0;i<project.todo_lists.length;i++){
				if (project.todo_lists[i].id == app.new_todo_item.todo_list_id){
					project.todo_lists[i].items.push(app.new_todo_item);	
					list = project.todo_lists[i];
				}
			}
			// add it to the todo_items hash
			app.todo_items[id] = app.new_todo_item;
			// add it to the dropdown, select it, show the dropdown
			
			select.append('<option value="' + id + '">' + list.name + ": " + app.new_todo_item.name + '</option>').val(id).show();
			$('#new_todo_form').remove();
		}
		app.tabs.unblock();
		app.statusBar.clear();
	},
	findTodoItem : function(id){
	    console.log('looking up unlisted todo item');
		var opts = $.extend(app.ajaxOptions, {
			url: app.url + "/todo_items/" + id + ".xml",
			async:false,
			complete: function(response){
				if (response.status == 200){
					var node = $(response.responseXML).find("todo-item");
					//var hash = app.parseTodoItem(node, id);
					app.todo_items[id.toString()] = new TodoItem.fromXml(node);
					//Cache.put("todo_items", JSON.stringify(app.todo_items));
				}
			}
		});
		$.ajax(opts);
	},
	buildProjectDropdown : function(){
	    var elm = $("#time_entry_project_id");
		elm.html('<option value="" selected="selected">Select a project</option>');
		var companies = [], company_names = [];
		$(app.projects).each(function(){
			if (companies[this.company_name])
				companies[this.company_name].push(this);
	 		else {
				companies[this.company_name] = [this];
				company_names.push(this.company_name);
			}
		});
		$(company_names.sort(charSort)).each(function(){
			var optgroup = $('<optgroup label="' + this + '"></optgroup>');
			$(companies[this]).each(function(){
				optgroup.append("<option value=\"" + this.id + "\">" + this.name + "</option>");
			});
			elm.append(optgroup);
		});
		
	    //$(app.projects).each(function(){
	        //elm.append("<option value=\"" + this.id + "\">" + this.name.substring(0,40) + " (" + this.company_name.substring(0,20) + ") </option>")
	    //});
	},
	toggleTimer: function(){
		var button = $(this);
		if (button.html() == "Start Task") { // start the task timer
			button.html("Finish Task");
			$('#pause_timer').show();
			app.clock.countdown({since: "-1s", format:"HMS", compact: true});
			//app.clock.countdown({since: "-1s"});
		} else { // finish task
			button.html("Start Task");
			$('#pause_timer').hide();
			var elapsed = app.convertElapsedTime(app.clock.countdown("getTimes"));
			app.clock.countdown("destroy");
			$('#hours').val(elapsed).hide().fadeIn().effect("highlight").focus();
			// get time, copy to input, then reset value
		}
	},
	convertElapsedTime: function(time){
		var seconds = time[6], minutes = time[5], hours = time[4];
		elapsed = (hours + minutes / 60 + seconds / 3600);
		if (elapsed < 0.25) {
			elapsed = 0.25;
		} else {
			var decimal = elapsed - parseInt(elapsed);
			if (decimal == 0) elapsed = hours;
			else if (decimal <= .25) elapsed = hours + 0.25;
			else if (decimal > .25 && decimal <= .50) elapsed = hours + 0.50;
			else if (decimal > .50 && decimal <= .75) elapsed = hours + 0.75;
			else if (decimal > .75) elapsed = hours + 1;
		}
		return elapsed;
	},
	pauseTimer : function(){
	    var button = $(this);
	    if (button.html() == "Pause") {
	        app.clock.countdown("pause");
	        button.html("Resume");
	    } else {
	        app.clock.countdown("resume");
	        button.html("Pause");
	    }
	},
	getProjectById: function(id){
	    var project;
	    $(app.projects).each(function(){
	        if (!project) {
	            if (this.id == id) {
	                project = this;
	            }
	        }
	    });  
	    return project;
	}
}

