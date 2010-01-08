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
    	$('#timesheet_form').submit(function(){return app.timelog.submitEdit(); });
    	$('.total_hours:first').html($('.total_hours:last').html());
    	$('input.datepicker').datepicker();
    	$('#prefs_submit').bind("click", app.establishConnection);
		$('#reload_link').bind("click", function(){app.reload(); return false;});
		$('#refresh_link').bind("click", function(){app.refreshTime(); return false;});

		/*
		$('#tabstrip li').bind("click", function(){
            var tab = this.id.replace("_tab", "");
            app.tabs.setTab(tab); 
        });
		*/
		$(window).bind("load", this.establishConnection);
	},
    ajaxOptions: {format:'xml', type:'GET',contentType: 'application/xml'},
    projects: [],
    todo_items: {},
    todo_lists: [],
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
		
		var prefsMenu = targetMenu.addItem(new air.NativeMenuItem("Basecamp Account"));
		prefsMenu.submenu = new air.NativeMenu();
		newCustomer = prefsMenu.submenu.addItem(new air.NativeMenuItem("Log In"));
		newCustomer.addEventListener(air.Event.SELECT, function(){app.reset()});
		newCustomer = prefsMenu.submenu.addItem(new air.NativeMenuItem("Forget Me"));
		newCustomer.addEventListener(air.Event.SELECT, function(){app.tabs.setTab("prefs");});
		
		viewTimelog = viewMenu.submenu.addItem(new air.NativeMenuItem("Time Log"));
		viewTimelog.addEventListener(air.Event.SELECT, function(){app.tabs.setTab("timelog");});

		viewTodos = viewMenu.submenu.addItem(new air.NativeMenuItem("Todo Lists"));
		viewTodos.addEventListener(air.Event.SELECT, function(){app.tabs.setTab("todo_lists");});

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
			console.log(url, user, password);
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
			//app.ajaxOptions.username = user;
			//app.ajaxOptions.password = password;
            //air.Introspector.Console.log('connecting to app');
			app.statusBar.set("Connecting to Basecamp");
			app.tabs.block();
			var opts = $.extend({async:true, cache:false}, app.ajaxOptions);
        	opts.url = app.url + "/me.xml";
        	opts.username = user;
        	opts.password = password;
        	opts.success = function(personNode) { 
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
        		app.fetchProjects();
        	};
        	opts.error = function(response){
        	    // do something
				app.tabs.unblock();
				app.statsBar.set("Unable to authenticate you");
        	    app.tabs.setTab("prefs");
        	    $('#prefs_basecamp_url').focus();
        	}
			
        	$.ajax(opts);
        } else {
    	    app.tabs.setTab("prefs");
    	    $('#prefs_app.url').focus();
        }
    },
    fetchProjects : function(){
        if (app.user){
			app.statusBar.set("Fetching projects and todos");
            app.projects = Cache.get("projects");
            if (!app.projects){
                app.loadProjects();
                Cache.put("projects", JSON.stringify(app.projects));
                Cache.put("todo_items", JSON.stringify(app.todo_items));
            } else {
                app.projects = JSON.parse(app.projects);
                app.todo_items = JSON.parse(Cache.get("todo_items"));
                $(app.projects).each(function(){app.renderTodoListsForProject(this)});
            }
            app.timelog.showThisWeek();
        }
    },
	reset: function(){
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
    loadProjects : function(){
        //air.Introspector.Console.log("loading project list")
        var opts = $.extend(app.ajaxOptions, {
            url: app.url + "/projects.xml", 
            type:'GET',
            async: false, 
            cache: false            
        });
        opts.success = function(root){
            //air.Introspector.Console.log("filtering active projects")
            app.projects = [];
            $(root).find("project").each(function(){
                if ($(this).find("status").text() == "active")
                    app.projects.push({
                        name: $(this).children("name").text(),
						company_name: $(this).children("company").children("name").text(),
                        description: $(this).children("announcement").text(),
                        id: $(this).children("id").text(),
                        todo_lists: []
                    }); 
            });
            //air.Introspector.Console.log("projects loaded", app.projects);
            app.loadTodos();
        };
		opts.error = function(){
			app.statusBar.set("Error loading projects");	
		}
        $.ajax(opts);
    },

	parseTodoItem : function(item, id){
		var mine, rpid, rpel = $(item).children("responsible-party-id");
        if (rpel){
        	rpid = rpel.text();
            if (rpid == app.user.id)
            	mine = true;
        }
        return {
        	id: id,
            name: $(item).children("content").text(),
            completed: ($(item).children("completed").text() == "true"),
            mine: mine,
            list: $(item).children("todo-list-id").text()
        };

	},
    loadTodos : function(){
        //air.Introspector.Console.log("loading todos")
		app.statusBar.set("Loading todo items");
        var opts = $.extend(app.ajaxOptions, {
            url: app.url + "/todo_lists.xml",
            data: {'responsible_party': app.user.id},
            type: 'GET',
            async: false,
            cache: false
        });
        var state = "mine";
        opts.success = function(root){
            var temp_list = [], mine;
            $(root).find("todo-list").each(function(){
               var id = $(this).children("id").text(),
                    project_id = $(this).children("project-id").text();
               
               // cycle through the projects and todo lists to see if we have a new lists or items to add
               var list = {
                   id: id,
                   name: $(this).children("name").text(),
                   completed: ($(this).children("completed").text() == "true"),
                   project_id: project_id,
                   items: []
               } 
               $(this).find("todo-item").each(function(){
					var id = $(this).children("id").text(),
						hash = app.parseTodoItem(this, id);
                   list.items.push(hash);
                   app.todo_items[id] = hash;
               });
               temp_list.push(list);
            });
            for(var i=temp_list.length-1;i>=0;i--){
                app.todo_lists.push(temp_list[i]);
            }
			app.statusBar.clear();
        }
		opts.error = function(){
			
		}
        $.ajax(opts);
        state = "anyone";
        opts.url = app.url + "/todo_lists.xml";
        opts.data = {"responsible_party": ""};
        $.ajax(opts);
        
        // now that I have the todos I need to attach them to their projects
        $(app.todo_lists).each(function(){
            var project = app.getProjectById(this.project_id);
            // my todos are loaded first, so we can assume that we haven't already added this todo list
            if (state == "mine")
                project.todo_lists.push(this);
            else {
                // we need to see if we have already loaded the list, and if so concat the items
                var matched;
                for (var i=0;i<project.todo_lists.length;i++){
                    if (project.todo_lists[i].id == this.id) {
                        matched = true;
                        project.todo_lists[i].items = project.todo_lists[i].items.concat(this.items);
                    }
                }
                if (!matched){
                    project.todo_lists.push(this);
                }
            }
        });

    	for (i in app.projects) {
            // app.projects[i].todo_lists = app.loadTodosForProject(app.projects[i].id);
            app.renderTodoListsForProject(app.projects[i]);
    	}
        
    },
    renderTodoListsForProject : function(project){
        var elm = $('#todo_list_content'), 
            list_count = project.todo_lists.length,
            item_count = 0; //, my_items_count = 0;
        $(project.todo_lists).each(function(){
            item_count += this.items.length;
            // $(this.items).each(function(){
            //     if (this.mine) my_items_count += 1;
            // })
        })
        if (item_count){
            // elm.append("<a style=\"float:right\" href=\"#\" onclick=\"this.refreshTodoList(" + project.id + ");return false;\">Refresh</a>");
            elm.append("<h3>" + project.name + " (" + item_count + " todos on " + list_count + " lists)</h3>");
            var div = $('<div id="todo_project_' + project.id + '" style="display:none"></div>');
            app.renderTodoListContents(project.todo_lists, div);
            elm.append(div);
			elm.find("h3").bind("click", function(){$('#todo_project_' + project.id).slideToggle();});
        }        
    },
    renderTodoListContents : function(lists, div) {
        $(lists).each(function(){
            var h4 = $("<h4>" + this.name + "</h4>"), items_completed = true;
            div.append(h4);
            var subdiv = $("<ol></ol>");
            $(this.items).each(function(){
                var li = $("<li id=\"item" + this.id + "\">" + this.name + "</li>");
                if (this.mine)
                    li.addClass("mine");
                if (this.completed) {
                    li.addClass("completed");
                } else {
                    items_completed = false;
                    li.append("<span>(<a href=\"#\">completed?</a>)</span>");
                }
				li.find("a").bind("click", function(){app.completeTodoItem($(this).parents("li").attr("id").replace("item",""));return false;});
                subdiv.append(li);
            });
            if (items_completed) h4.addClass("completed");
            div.append(subdiv);
        });
        div.find("h4").bind("click", function(){$(this).next("ol").slideToggle();})
        
    },
    refreshTodoList : function(id){
        var project, index;
        for(i in app.projects)
            if (app.projects[i].id == id) {
                project = app.projects[i];
                index = i;
            }
        if (project) {
            var div = $('#todo_project_' + id);
            div.html('').addClass("loading");
            var todos = app.loadTodosForProject(id);
            app.renderTodoListContents(todos, div);
            app.projects[index].todo_lists = todos;
            Cache.put("projects", JSON.stringify(app.projects));
        }
    },
	addTodoLink : function(){
		var text = $(this).html();
		if (text && app.todo_items[text]) {
			//var link = "<a href='" + app.url + "/todolists/" + app.todo_items[text].list + "?time_for=" + text + "#item_" + text + "'>" + app.todo_items[text].name + "</a>";
			$(this).parents("tr").children("td.description").prepend("<span class='todo'>" + app.todo_items[text].name + "</span>");
		}	
	},
	completeTodoItem : function(id){
	    var opts = $.extend(app.ajaxOptions,{
	        url: app.url + "/todo_items/" + id + "/complete.xml",
	        type: 'PUT',
	        processData: false,
	        complete: function(response){
	            if (response.status == 200)
	                $("#item" + id).addClass("completed").find("span").remove();
	        }
	    });
	    $.ajax(opts);
	},
	getTodos: function(){
	    var param = $(this).val();
	    if (!param) {
	        $("#todos_wrapper").hide(); //slideUp("fast", function(){ $(this).remove()});
	    } else {
			var html = ""
			$(app.projects).each(function(){
				if (this.id == param) {
					html += "<option value=''>No Todo for this time entry</option>";

					// until I have "add a new todo list" working, only add if there is an existing list
					if (this.todo_lists.length > 0)
						html += "<option value='new'>Add a new todo item</option>";
					$(this.todo_lists).each(function(){
						var list = this;
						$(list.items).each(function(){
							html += "<option value='" + this.id + "'>" + list.name + ": " + this.name + "</option>";
						});
					});
				}
			});
			if (html.length > 0) {
				$("#todos_wrapper").html("<img src='resources/todo_bug.gif' /><select id='todos' name='time_entry[todo_item_id]'>" + html + "</select>");
				$('#todos').bind("change", app.checkForNewTodo);
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
			$('#todos').hide().after('<div id="new_todo_form"></div>');
			$('#new_todo_form').append(newTodo).append(newTodoName).append(newTodoButton);
			$('#new_todo_form').append('<button id="new_todo_cancel">Cancel</button>');
			$('#new_todo_cancel').bind("click", function(){
				$('#todos').show();
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
					$('#add_time').block({message: null});
					var options = $.extend({}, app.ajaxOptions);
					options.processData = false;
					options.async = false;
					options.cache = false;
					options.type = "POST";
					data = {content: name};
					options.data = app.todoItemToXml(data);
					app.new_todo_item = {name: name, todo_list_id: list_id};
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
			$('#todos').append('<option value="' + id + '">' + list.name + ": " + app.new_todo_item.name + '</option>');
			$('#new_todo_form').remove();
			$('#todos').val(id).show();
		}
		$('#add_time').unblock();
		app.statusBar.clear();
	},
	findTodoItem : function(id){
		var opts = $.extend(app.ajaxOptions, {
			url: app.url + "/todo_items/" + id + ".xml",
			async:false,
			complete: function(response){
				if (response.status == 200){
					var node = $(response.responseXML).find("todo-item");
					var hash = app.parseTodoItem(node, id);
					app.todo_items[id.toString()] = hash;
					Cache.put("basecamp_todos", JSON.stringify(app.todo_items));
				}
			}
		});
		$.ajax(opts);
	},
	buildProjectDropdown : function(){
	    var elm = $("#time_entry_project_id");
		elm.html('');
	    $(app.projects).each(function(){
	        elm.append("<option value=\"" + this.id + "\">" + this.company_name.substring(0,12) + ": " + this.name.substring(0,25) + "</option>")
	    });
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