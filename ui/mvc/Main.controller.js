sap.ui.controller("mvc.Main", {

	onInit: function() {
		waitingSymbols = ["\\", "|", "/", "-"];
		currentWaitingSymbolIndex = 0;
		listenerCommands = [{text:""}];
        bindEvent("on_module_message", mainController.onModuleMessage);
        bindEvent("on_listener_message", mainController.onListenerMessage);
	},

    onModuleMessage: function(event) {
        var args = event.args;
        var moduleName = args["module_name"];
        var state = args["state"];
        var message = args["message"];
        var currentTab = modulesTabs[moduleName].tab;
        var logTextView = modulesTabs[moduleName].module_log.textView;

        var previousMessages = logTextView.data("messages") ? (logTextView.data("messages") + "\n" + message) : message;
        logTextView.data("messages", previousMessages);


        //If another client opens a new tab
		if (!Object.keys(modulesTabs).any(moduleName)) {
            return;
        }

        logTextView.setText(logTextView.data("messages"));
        mainController.panelScrollDown(modulesTabs[moduleName].module_log.panel);
        if (state != null) {
            currentTab.setState(state);
            if(state)
                messageController.addInfoMessage("Module {name} was succeeded".assign({name: moduleName}));
            else
                messageController.addErrorMessage("Module {name} was failed".assign({name: moduleName}));
        }
    },

	onListenerMessage: function(event) {
        var args = event.args;
        var moduleName = args["module_name"];
        var message = args["message"];
        var isShellConnected = args["state"];

        //If another client opens a new tab
        if (!Object.keys(modulesTabs).any(moduleName)) {
            return;
        }
        var listenerTextView = modulesTabs[moduleName].listener.textView;
        var listenerCommandsField = modulesTabs[moduleName].listener.textField;
        if (message)
            listenerTextView.setValue(listenerTextView.getValue() + "\n" + message);
        mainController.elementScrollDown(listenerTextView);
        var currentTab = modulesTabs[moduleName].tab;
        currentTab.setListenerState(isShellConnected);
        if (isShellConnected) {
            if (!modulesTabs[moduleName].isShellConnected) {
                modulesTabs[moduleName].listener.panel.setText("Shell is connected to listener");
                messageController.addInfoMessage("Shell connected to " + moduleName + " listener");
            }
            if (isShellConnected === 2) {
                messageController.addErrorMessage("Shell was disconnected from " + moduleName);
                listenerCommandsField.setEnabled(false);
                modulesTabs[moduleName].listener.panel.setText("Shell is disconnected from listener");
            }
            modulesTabs[moduleName].isShellConnected = true;
        }
    },

	getWaitingSymbol: function() {
		if(currentWaitingSymbolIndex === waitingSymbols.length - 1){
			currentWaitingSymbolIndex = 0;
		} else {
			currentWaitingSymbolIndex += 1;
		}
		return waitingSymbols[currentWaitingSymbolIndex];
	},

	onTabClose: function(oEvent){
		///Fires when tab close button clicked
		var tabName = oEvent.getParameter("name");
		guiCommandsHandler.killProcess(tabName); //Request to kill process on server side
		modulesTabs[tabName].tab.destroyContent();//Destroy all tab content
		modulesTabs[tabName].tab.destroy();//Destroy all tab content
		delete modulesTabs[tabName]; //Remove tab object from modulesTabs
	},

	reconnect: function(){
		websocketHandler.reconnect();
	},

	onTreeNodeSelected: function(event){
		var infoTextControl = mainView.byId("Main_ModuleInfoTextView");
		infoTextControl.destroyControls();
		var indexOfCtrl = 0;
		var description = event.oSource.getBindingContext().getProperty('DESCRIPTION');
		var vendor = event.oSource.getBindingContext().getProperty('VENDOR');		
		var cve = event.oSource.getBindingContext().getProperty('CVE Name');
		var downlink = event.oSource.getBindingContext().getProperty('DOWNLOAD_LINK');
		var notes = (event.oSource.getBindingContext().getProperty('NOTES'));
        notes = notes.replace(new RegExp("\n",'g'), "<br>");
		var links = event.oSource.getBindingContext().getProperty('LINKS');
		var vendorText  = "";
		var cveText = "";
		var downlinkText = "";
		var linkText = "";
		var oLink;

		if (vendor) {
			if (vendor.trim().toLowerCase().startsWith('http')) {
				oLink = new sap.ui.commons.Link("vendor_", {
					text: vendor,
					href: vendor,
					target: "_blank"
				});
				infoTextControl.addControl(oLink);
				vendorText = '<embed data-index=\"'+indexOfCtrl+'\" />';
				indexOfCtrl += 1;
			}
			else {
				vendorText = vendor;
			}
		}
		if (cve) {
			oLink = new sap.ui.commons.Link("cve_", {
				text: cve,
				href: "https://www.google.ru/search?q="+cve,
				target: "_blank"
			});
			infoTextControl.addControl(oLink);
			cveText = '<embed data-index=\"'+indexOfCtrl+'\" />';
			indexOfCtrl += 1;
		}
		if (downlink) {
			oLink = new sap.ui.commons.Link("dl_", {
				text: downlink,
				href: downlink,
				target: "_blank"
			});
			infoTextControl.addControl(oLink);
			downlinkText = '<embed data-index=\"'+indexOfCtrl+'\" />';
			indexOfCtrl += 1;
		}
		if (links) {
			if ($.isArray(links)) {
				linkText = "";
				links.forEach(function(el, index) {
					oLink = new sap.ui.commons.Link("link_"+index, {
						text: el,
						href: el,
						target: "_blank"
					});
					linkText += '<embed data-index=\"'+ indexOfCtrl +'\" />,  ';
					infoTextControl.addControl(oLink);
					indexOfCtrl += 1;
				});
			}
			else {
				oLink = new sap.ui.commons.Link("link_"+0, {
					text: links,
					href: links,
					target: "_blank"
				});
				infoTextControl.addControl(oLink);
				linkText += '<embed data-index=\"'+ indexOfCtrl +'\" />';
			}
		}		

		var text = "<strong>Description:</strong> " + (description || "n/a") + "<br>";
        text += "<strong>Vendor:</strong> " + (vendorText || "n/a") + "<br>";
        text += "<strong>CVE Name:</strong> " + (cveText || "n/a") + "<br>";
        text += "<strong>Download link:</strong> " + (downlinkText || "n/a") + "<br>";
        text += "<strong>Links:</strong> " + (linkText || "n/a") + "<br>";
        text += notes;
		infoTextControl.setHtmlText(text);
	},

	onNodeExpanded: function() {
		if (!this.getExpanded())
            this.setIcon('sap-icon://open-folder');
        else
            this.setIcon("sap-icon://folder-blank");
	},
	
	addTab: function (tab_name, listener){
		///Creates new tab and add tab definitions to modulesTabs
		var use_listener; // Use listener or not
		if (listener)
			use_listener = true;
		var tabContentTextView = new sap.m.Text({text:"Starting...", height:'50%'});
		var panel = new sap.ui.commons.Panel({
			height: use_listener ? "50%" : "100%",
			width: '100%',
			text: 'Log:',
			content: [tabContentTextView]
		});

		var tab = new custom.controls.Tab({text: tab_name, height: '100%', useListener: use_listener});
		tab.addContent(panel);
		panel.addEventDelegate({
			onAfterRendering: function() {
				mainController.panelScrollDown(this);
			}
		}, panel);
		var oTabStripWidget = mainView.byId("Main_LogTabsWidget");
		modulesTabs[tab_name] = {
				tab: tab, //tab control()
				module_log: {textView: tabContentTextView, panel:panel},
				listener: null,
                isShellConnected: false
		};
		oTabStripWidget.addItem(tab);
		oTabStripWidget.setSelectedItem(tab);
		if(use_listener){
			var listenerPanel = mainController.createListenerTemplate(tab_name);
			tab.addContent(listenerPanel.panel);
			modulesTabs[tab_name]["listener"] = listenerPanel;
		}
	},

	searchModules: function(event){
		var textToSearch = event.getParameters().newValue;
		var oModulesTree = mainView.byId("Main_ModulesTree");
		var binding = oModulesTree.getBinding("nodes");
		if (!textToSearch){
			//Remove filter
			binding.filter([]);
			return;
		}
		//Creating filters by fields
		var oNameFilter = new sap.ui.model.Filter("NAME", "Contains", textToSearch);
		var oDescFilter = new sap.ui.model.Filter("DESCRIPTION", "Contains", textToSearch);
		var oCveFilter = new sap.ui.model.Filter("CVE Name", "Contains", textToSearch);
		var oVendorFilter = new sap.ui.model.Filter("VENDOR", "Contains", textToSearch);

		var oFileFilter = new sap.ui.model.Filter("isFile", sap.ui.model.FilterOperator.EQ, true);//Check if node is file or directory
		var orFilter = new sap.ui.model.Filter([oNameFilter, oCveFilter, oDescFilter, oVendorFilter]);//apply OR operation for filters
		binding.filter([orFilter, oFileFilter]);//apply AND operation for filters
		if(textToSearch)
			oModulesTree.expandAll();
	},
    
    setConnectionState: function(state){
		///Changes ConnectButton state
        var connectButton = mainView.byId("Main_ReconnectButton");
        if (state){
            connectButton.setType(sap.m.ButtonType.Accept);
            connectButton.setText("Connected");
            connectButton.setTooltip("GUI connected to server");
        } else {
            connectButton.setType(sap.m.ButtonType.Reject);
            connectButton.setText("Reconnect");
            connectButton.setTooltip("Try to reconnect to server");
        }
    },

	sendListenerCommand: function(event){
		var command = this.getValue();
		this.setValue("");
		var moduleName = this.data('module_name');
        var listenerView = modulesTabs[moduleName].listener.textView;

        listenerView.setValue(listenerView.getValue() + "\n\n>> " + command);
        mainController.elementScrollDown(listenerView);

		listenerCommands.remove({text: command});
		listenerCommands.insert({text: command}, 1);
		var oModel = new sap.ui.model.json.JSONModel();
		oModel.setData(listenerCommands);
		this.setModel(oModel);
		guiCommandsHandler.sendListenerCommand(moduleName, command);
	},

	createListenerTemplate: function(module_name){
		//LISTENER PANEL
		var listenerPanel = new sap.ui.commons.Panel({
			height: "50%",
			width:"100%",
			text: "Listener",
			areaDesign: sap.ui.commons.enums.AreaDesign.Plain
		});

		var listenerCommandView = new sap.ui.commons.TextArea({
			width: "100%",
			height: "90%",
			editable: false
		});
		listenerCommandView.addStyleClass("moduleInfoTextView");

		listenerCommandView.addEventDelegate({
			onAfterRendering: function () {
				mainController.elementScrollDown(this);
			}
		}, listenerCommandView);
		var listenerCommandField = new sap.ui.commons.ComboBox({
			height: "10%",
			width: "100%",
			placeholder:"Enter commands here...",
			items: {
				path: "/",
				template: new sap.ui.core.ListItem({text: "{text}"})
			}
		});
		listenerCommandField.addEventDelegate({
			onsapenter: mainController.sendListenerCommand
		}, listenerCommandField);
		listenerCommandField.data('module_name', module_name);
		listenerPanel.addContent(listenerCommandView);
		listenerPanel.addContent(listenerCommandField);
		return {panel: listenerPanel, textView: listenerCommandView, textField: listenerCommandField};
	},

	runModule: function(oEvent){
		if (oEvent.type == 'dblclick' && !this.getSelectable())
			return;
		var nodes = mainController.getSelectedNodes('You should select module to run');
		if (nodes.length <= 0 || !nodes[0].getSelectable())
			return;
		var dialog = runDialogView.byId("RunDialog_Dialog");
		dialog.setTitle(nodes[0].getText());
		guiCommandsHandler.showOptions(nodes[0].getText(), function(evt) {
			var args = evt.args;
			var target = mainView.byId("Main_Target").getValue().split(':');
			var host = target[0];
			var port = target[1];
			//change host and port if available
			for (var index in args) {
				if (!args.hasOwnProperty(index))
					continue;
				var entry = args[index];
				if (entry == null)
					continue;
				if (entry["option"].toLowerCase() === "host" && host)
					entry.value.value = host;
				if (entry["option"].toLowerCase() === "port" && port)
					entry.value.value = port;
			}
			oOptionsModel = new sap.ui.model.json.JSONModel();
			oOptionsModel.setData(args);
			dialog.setModel(oOptionsModel);
			dialog.open();
		});
	},

	openEditor: function(event) {
		var nodes = mainController.getSelectedNodes('You should select module to edit');
		if(nodes.length <= 0)
			return;
		guiCommandsHandler.getSource(nodes[0].getText(), function(evt) {
			var args = evt.args;
			var oData = args;
			var model = new sap.ui.model.json.JSONModel();
			model.setData(oData);
			var dialog = codeEditorDialogView.byId('CodeEditor_Dialog');
			dialog.setModel(model);
			dialog.setTitle(args['module_name']);
			dialog.open();
			codeEditorDialogController.loadEditor();
		});
	},

	getSelectedNodes: function(warnMessage) {
		var oTree = mainView.byId('Main_ModulesTree');
		_checkedNodes = [];

		oTree.getNodes().forEach(function(node){
			if(node.getIsSelected()) _checkedNodes.push(node);
			mainController._getCheckedSubNodes(node);
		});
		if(_checkedNodes.length <= 0){
			sap.m.MessageToast.show(warnMessage, {
				my: "center center",
				at: "center center",
				duration: 1000
			});
		}
		return _checkedNodes;
	},

	_getCheckedSubNodes: function(node){
		node.getNodes().forEach(function(subNode){
			if(subNode.getIsSelected()) _checkedNodes.push(subNode);
			mainController._getCheckedSubNodes(subNode);
		});
	},

	getActiveTabKey: function(node) {
        var oTabStripWidget = mainView.byId("Main_LogTabsWidget");
        if (oTabStripWidget.getItems().length === 0) {
            return null;
        }
        var key = oTabStripWidget.getSelectedKey();
        return key;
    },

	getActiveTabName: function() {
		var oTabStripWidget = mainView.byId("Main_LogTabsWidget");
		var key = mainController.getActiveTabKey();
        if (!key)
            return null;
		var name = sap.ui.getCore().byId(key).getText();
		return name;
	},

	addModuleTab: function(evt) {
		var args = evt.args;
		if (args && args['module_name'])
			mainController.addTab(args['module_name'], args['listener']);
	},

    refresh: function(evt) {
        var moduleName = mainController.getActiveTabName();
        if (!moduleName){
            document.title = "EaST UI";
            return;
        }
        var tab = modulesTabs[moduleName].tab;
        var logView = modulesTabs[moduleName].module_log.textView;

        var docTitle = "In progress...";
        var state = tab.getState();
        if (state != null) {
            docTitle = state ? "Success" : "Failed";
        }
        logView.data("messages", logView.data("messages") || ""); //for empty data "messages"
        if (state == null){
            logView.setText((logView.data("messages") || "") + "\n" + mainController.getWaitingSymbol());
        }
        var listenerState = tab.getListenerState();
        if (listenerState)
            docTitle += "(with shell)";
        document.title = docTitle;
    },

	getModulesLog: function() {
		guiCommandsHandler.getModulesLog(function(evt) {
			var modules = evt.args;
			mainController.restoreTabs(modules);
			Object.keys(modules, function(moduleName, module) {
				var state = module.state;
				var messages = module.message;
				var currentTab = modulesTabs[moduleName].tab;
				var logTextView = modulesTabs[moduleName].module_log.textView;
                logTextView.setText(messages);
                logTextView.data("messages", messages);
                //scroll down when after adding new message
                mainController.panelScrollDown(modulesTabs[moduleName].module_log.panel);
                if (state!=null)
                    currentTab.setState(state);
				var listener = module.listener;
				if (listener) {
					var listenerMessages = listener.message;
					var isShellConnected = listener.connected;
                    if (isShellConnected === 2) {
                        modulesTabs[moduleName].listener.textField.setEnabled(false);
                    }
                    currentTab.setListenerState(isShellConnected);
                    modulesTabs[moduleName].listener.textView.setValue(listenerMessages);
                    mainController.elementScrollDown(modulesTabs[moduleName].listener.textView);
				}
			})
		});
	},

	panelScrollDown: function(panel) {
		panel.setScrollTop(999999);
	},

	elementScrollDown: function(element) {
		element.$().scrollTop(999999);
	},

	restoreTabs: function(modules) {
		Object.keys(modules, function (moduleName, module) {
			if(!Object.has(modulesTabs, moduleName)) {
				mainController.addTab(moduleName, module["listener"]);
			}
		})
	}

});