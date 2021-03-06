window.app = {
    scale: 1,
    page: {x:850, y:1100},
    debugStatus: false,
    snapshotMode: false,
    fills: {
        dflt:{fg:"black",bg:"gainsboro"},
        yellow:{fg:"black",bg:"yellow"},
        green:{fg:"black",bg:"lightgreen"},
        blue:{fg:"black",bg:"powderblue"},
        brown:{fg:"black",bg:"tan"},
        pink:{fg:"black",bg:"mistyrose"},
        red:{fg:"black",bg:"lightpink"},
        black:{fg:"white",bg:"dimgray"},
        Byellow:{fg:"black",bg:"goldenrod"},
        Bgreen:{fg:"white",bg:"seagreen"},
        Bblue:{fg:"white",bg:"blue"},
        Bbrown:{fg:"white",bg:"saddlebrown"},
        Bpink:{fg:"black",bg:"fuchsia"},
        Bcoral:{fg:"black",bg:"orangered"},
        error:{fg:'yellow',bg:"red"}
    },
    colors: {
        halo: "black",
        doneLine: "darkgreen",
        notDoneLine: "saddlebrown",
        doneFill: "palegreen",
        blockedFill: "papayawhip",
        activeFill: "gold",
        activeArrowFill: "red",
        dragFill: "gainsboro"
    },
    emptyTitle: 'Better Way Workflow',
    localStorage: {slot:1, slots:[null,null,null,null,null,null,null,null,null,null,null]},
    pendingAction: null,
    editing: false,
    mode: "work" // or "design"
}

app.setPageScale = function(val) {
    var rng = document.getElementById("rngScale");
    if (val == undefined) {
        app.scale  = rng.value / 100;
    } else {
        if (val == "width") {
            var container = document.getElementById("canvasContainer");
            var box = container.getBoundingClientRect();
            app.scale = (box.width - 40) / app.page.x; // 20 px margins
            rng.value = app.scale * 100;
        } else if (val == "height") {
            var container = document.getElementById("canvasContainer");
            var box = container.getBoundingClientRect();
            app.scale = (box.height - 40) / app.page.y; // 20 px margins
            rng.value = app.scale * 100;
        } else {
            if (val <= 1) {
                app.scale = val;
                rng.value = val * 100;
            } else {
                app.scale = val / 100;
                rng.value = val;
            }
        }
    }
    WF.createCanvas();
    WF.drawCanvas();
}
app.debug = function(msg) {
    if (app.debugStatus) {
        console.log(msg);
    }
}
app.readFromFile = function(event) {
    var reader = new FileReader();
    reader.addEventListener('load', (event) => {
        var tbox = document.getElementById("locLoadFromClipboard");
        try {
            var tmp = JSON.parse(event.target.result);
            if (tmp == null) {
                app.toast("Invalid file contents", true);
            } else {
                tbox.value = event.target.result;
                app.loadFromTextbox();
            }    
        } catch(e) {
            app.toast("Invalid file contents", true);
        }
    });
    reader.readAsText(event.target.files[0]);    
    app.toast("Reading file '" + event.target.files[0] + "'...");
}
app.loadFromDroppedFile = function(event) {
    event.stopPropagation();
    event.preventDefault();
    var files = event.target.files || event.dataTransfer.files;

    // process all File objects
    var f = files[0]; // Should only be one
    if (f == undefined) {
        app.toast("Invalid item dropped", true);
        return;
    }
    var reader = new FileReader();
    reader.onload = function(e) {
        if (e.target.result.substr(0,1) == "{") {
            var tbox = document.getElementById("locLoadFromClipboard");
            var tmp = JSON.parse(e.target.result);
            if (tmp == null) {
                app.toast("Invalid file contents", true);
            } else {
                tbox.value = e.target.result;
                app.loadFromTextbox();
                //app.toast("Dropped file '" + f.name + "'");
            }
        } else {
            app.toast("This does not appear to be a .flow file", true);
        }
    }
    reader.readAsText(f);        
}
app.blockWindowDrop = function(event) {
    event.stopPropagation();
	event.preventDefault();
}
app.downloadFile = function() {
    var json = JSON.stringify(WF.flow);
    var blob = new Blob([json], {type: 'text/plain'});
    if (app.URLLink != null) {
        window.URL.revokeObjectURL(app.URLLink);
        delete app.URLLink;
    }

    // Get rid of any prior link
    var a = document.getElementById("TEMPORARY_WF_FILE_DOWNLOAD_LINK");
    if (a != null) {
        document.body.removeChild(a);
    }

    app.URLLink = window.URL.createObjectURL(blob);
    var a = document.createElement("a");
    a.id = "TEMPORARY_WF_FILE_DOWNLOAD_LINK";
    a.style.display = "none"; // Hide it
    a.setAttribute("download", WF.flow.title + ".flow"); // Set default file name
    a.href = app.URLLink;

    document.body.appendChild(a);
    a.click();
    app.cancelAction();
}
app.resetFlow = function() {
    WF.pushTransaction();
    for (var key in WF.flow.items) {
        var itm = WF.flow.items[key];
        itm.doneCode = null;
        itm.completed = false;
    }
    WF.popTransaction();
    app.pickNext();
}
app.setMode = function(mode) {
    var wasMode = app.mode;
    if (mode == undefined) {
        if (app.mode == "work") {
            app.mode = "design";
        } else {
            app.mode = "work";
        }
    } else {
        app.mode = mode;
    }
    if (app.mode != wasMode) {
        document.getElementById("locModeName").innerHTML = app.mode;
        if (WF.pickedItem == null) {
            app.cancelAction(true);
        } else {
            app.cancelAction(false);
            app.editItem();
        }
    }
    var container = document.getElementById("formContainer");
    if (app.mode == "work") {
        container.style.backgroundColor = "honeydew";
    } else {
        container.style.backgroundColor = "khaki";
    }
}
app.toast = function(msg, isError, timeout) {
    if (isError == undefined) isError = false;
    if (msg == undefined) msg = "";
    var loc = document.getElementById("locToastMessage");
    loc.style.color = (isError ? "red" : "brown");
    loc.style.backgroundColor = (isError ? "yellow" : "transparent");
    loc.style.borderColor = (isError ? "black" : "brown");
    if (app.toastTimer != null) window.clearTimeout(app.toastTimer);
    if (msg == "") {
        loc.innerHTML = "";
        loc.style.display = "none";
        app.toastTimer = null;
    } else {
        loc.innerHTML = msg;
        loc.style.display = "block";
        if (timeout == undefined) timeout = 4000;
        app.toastTimer = window.setTimeout(function() {
            app.toast();
        }, timeout);
    }
}
app.askToAddNewItem = function() {
    if (app.mode == "work") return;
    WF.pickedItem = null;
    WF.drawCanvas();
    app.hideEditor();
    app.cancelAction(false);
    app.pendingAction = {action:"addItem"};
    var sel = document.getElementById("selNewItemShape");
    sel.value = (app.isCollectionEmpty(WF.flow.items) ? "pill" : "box");
    document.getElementById("txtNewItemName").value = "";
    document.getElementById("txtNewItemName").setAttribute("placeholder", "Item " + (app.collectionSize(WF.flow.items) + 1));
    document.getElementById("locConfirmAddItem").style.display = "";
}
app.confirmAddNewItem = function(x, y) {
    var name = document.getElementById("txtNewItemName").value.trim();
    if (name == "") name = document.getElementById("txtNewItemName").getAttribute("placeholder");
    var type = document.getElementById("selNewItemShape").value;
    app.mode = "design";
    var itm = WF.addItem(x, y, type, name);
    app.editItem();
    return itm;
}

app.editItem = function() {
    app.editing = true;
    app.cancelAction();
    if (app.mode == "design") {
        document.getElementById("itemEditor").style.display = "none";
        if (app.isCollectionEmpty(WF.flow.items) || WF.pickedItem == null) {
            document.getElementById("itemDetailEditor").style.display = "none";
        } else {
            document.getElementById("itemDetailEditor").style.display = "";
        }
    } else {
        if (app.isCollectionEmpty(WF.flow.items)) {
            document.getElementById("itemEditor").style.display = "none";
            app.editing = false;
        } else {
            document.getElementById("itemEditor").style.display = "";
        }
        document.getElementById("itemDetailEditor").style.display = "none";
    }
    if (!app.editing) return;
    var itm = WF.pickedItem;
    if (itm == null) {
        app.hideEditor();
        return;
    }
    var frm = document.getElementById("frmWF");
    frm.elements.namedItem("det_item_title").value = itm.title;
    document.getElementById("item_title").innerHTML = itm.title;
    frm.elements.namedItem("item_instructions").value = (itm.instructions == undefined ? "" : itm.instructions);
    var loc = document.getElementById("locCompleteOptions");
    loc.innerHTML = ""; // Get rid of prior options... leaving the Not completed option there
    var cantChange = !itm.canChangeComplete();
    var inco = document.getElementById("item_not_completed_option");
    inco.checked = !itm.completed;
    if (itm.completed && cantChange) {
        //inco.disabled = true;
    } else {
        inco.disabled = false;
    }
    var doneCodeCount = 0;
    var tbl = document.getElementById("tbl_done_codes");
    while (tbl.rows.length > 1) tbl.deleteRow(1);
    for (var key in itm.doneCodes) {
        var oneCode = itm.doneCodes[key];
        var chk = (itm.doneCode == key ? " checked" : "");
        var dis = "";
        if (itm.completed) {
            //if (cantChange) dis = " disabled";
        } else {
            if (itm.isBlocked()) dis = "disabled";
        }
        var h = "<br/><label><input style='margin-right:.2em;' type='radio'" + chk + dis;
        h += " onchange='app.updateItemComplete(this)'";
        h += " name='item_complete'";
        h += " value='" + key + "'>" + oneCode.value + "</label>";
        loc.innerHTML += h;

        var tr = tbl.insertRow();
        var td = tr.insertCell(); // X delete
        var h = "<span class='anchor x' ";
        h += "onclick='app.deleteDoneCode(\"" + key + "\")'>&times;</span>";
        td.innerHTML = h;
        td = tr.insertCell();
        td.style.textAlign = "center";
        td.onclick = function() {app.editDoneCode(this);}
        td.innerHTML = key;
        td.className = "anchor";
        td = tr.insertCell();
        td.onclick = function() {app.editDoneCode(this);}
        td.innerHTML = oneCode.value;
        td.className = "anchor";

        doneCodeCount++;
    }
    if (doneCodeCount == 0) {
        var tr = tbl.insertRow();
        var td = tr.insertCell();
        td.colSpan = "3";
        td.innerHTML = "No custom options defined. Options will be Not Completed or Completed";
        td.style.color = "grey";

        var chk = (itm.completed ? " checked" : "");
        var dis = "";
        if (itm.completed) {
            //if (cantChange) dis = " disabled";
        } else {
            if (itm.isBlocked()) dis = "disabled";
        }
        var h = "<br/><label><input style='margin-right:.2em;' type='radio'" + chk + dis;
        h += " onchange='app.updateItemComplete(this)'";
        h += " name='item_complete'";
        h += " value='Y'>Completed</label>";
        loc.innerHTML += h;
    }
    var txt = "";
    if (itm.instructions != undefined) {
        txt = "<fieldset><legend>Instructions</legend>" + itm.instructions.replace(/\n/g,"<p>") + "</fieldset>";
    }
    document.getElementById("locInstructions").innerHTML = txt;
    if (itm.unblockIfAnyCompleted) {
        document.getElementById("item_block_type_any").checked = true;
    } else {
        document.getElementById("item_block_type_all").checked = true;
    }
    frm.elements.namedItem("item_shape").value = itm.shape;
    // Blocks / Blocked Bys
    var tbl = document.getElementById("tbl_links");
    while(tbl.rows.length > 1) tbl.deleteRow(1);
    for (var id in itm.blockedBy) {
        var other = WF.flow.items[id];
        var title = other.title;
        //var allowCodes = itm.blockedBy[other.id].allowCodes;
        //if (allowCodes != null) title += " (" + allowCodes + ")";
        var tr = tbl.insertRow();
        var td = tr.insertCell();
        td.innerHTML = "<span class='anchor x' onclick='app.askToRemoveLink(\"blockBy\"," + other.id + ")'>&times;</span>";
        td = tr.insertCell(); td.style.textAlign = "center";
        td.innerHTML = "Blk'd By";
        td = tr.insertCell();
        td.innerHTML = "<span class='anchor' onclick='app.editLink(\"blockedby\"," + other.id + ")'>" + title + "</span>";
    }
    for (var id in itm.blocks) {
        var other = WF.flow.items[id];
        var title = other.title;
        var allowCodes = other.blockedBy[itm.id].allowCodes;
        if (allowCodes != null) title += " (" + allowCodes + ")";
        var tr = tbl.insertRow();
        var td = tr.insertCell();
        td.innerHTML = "<span class='anchor x' onclick='app.askToRemoveLink(\"blocks\"," + other.id + ")'>&times;</span>";
        td = tr.insertCell();
        td.innerHTML = "Blocks"; td.style.textAlign = "center";
        td = tr.insertCell();
        td.innerHTML = "<span class='anchor' onclick='app.editLink(\"blocks\"," + other.id + ")'>" + title + "</span>";
    }
}
app.hideEditor = function() {
    app.editing = false;
    document.getElementById("itemEditor").style.display = "none";
    document.getElementById("itemDetailEditor").style.display = "none";
}
app.deleteDoneCode = function(code) {
    var msg = "Delete option code '" + code + "'?";
    app.askToDoSomething(msg, "", app.setDoneCode, "Delete", {action:"deleteDone", code:code}, true, "design");
}
app.editDoneCode = function(el) {
    app.cancelAction();
    var code = null;
    var val = "";
    if (el != undefined) { // click event is tied to the TR element
        var tr = el.parentElement;
        code = tr.cells[1].innerText;
        val = tr.cells[2].innerText;
    }
    document.getElementById("txtEditDoneCode").value = (code == null ? "" : code);
    document.getElementById("txtEditDoneValue").value = val;
    app.pendingAction = {action:"editDoneCode", code:code, value:val};
    document.getElementById("locEditDoneCode").style.display = "";
}
app.setDoneCode = function() {
    var codes = WF.pickedItem.doneCodes;
    var act = app.pendingAction;
    var newCode = document.getElementById("txtEditDoneCode").value.trim();
    var newVal = document.getElementById("txtEditDoneValue").value.trim();
    if (act.code == null) {
        if (newCode == "") {
            app.cancelAction();
        } else {
            if (codes[newCode] != null) {
                app.toast("That option code is already used on this item", true);
            } else {
                if (app.isCollectionEmpty(codes)) {
                    for (var key in WF.pickedItem.blocks) {
                        var bby = WF.flow.items[key];
                        var lnk = bby.blockedBy[WF.pickedItem.id];
                        if (lnk.allowCodes == null) lnk.allowCodes = newCode;
                    }
                }
                codes[newCode] = {code:newCode, value:newVal}
                document.getElementById("txtEditDoneCode").value = "";
                document.getElementById("txtEditDoneValue").value = "";
                app.editItem();
            }
        }
    } else {
        if (newCode == "") {
            // I the item was completed with this code, throw an error
            if (WF.pickedItem.doneCode == act.code) {
                app.toast("Option code '" + act.code + "' cannot be deleted because it is the currently selected option.", true);
                return;
            }
            delete codes[act.code];
            // Remove anywhere it was used
            for (var id in WF.pickedItem.blocks) {
                var other = WF.flow.items[id];
                var link = other.blockedBy[WF.pickedItem.id];
                if (link.allowCodes != null) {
                    var lst = link.allowCodes.split(",").filter(function(cod) {
                        return cod != act.code;
                    });
                    if (lst.length == 0) {
                        link.allowCodes = null;
                    } else {
                        link.allowCodes = lst.join(",");    
                    }
                }
            }
            document.getElementById("txtEditDoneCode").value = "";
            document.getElementById("txtEditDoneValue").value = "";
            app.editItem();
        } else {
            if (newCode == act.code) {
                codes[act.code].value = newVal;
                app.editItem();
            } else if (codes[newCode] != null) {
                app.toast("That option code is already used on this item", true);
            } else {
                delete codes[act.code];
                codes[newCode] = {code:newCode, value:newVal}
                // Replace old witth new everywhere it is referenced
                for (var id in WF.pickedItem.blocks) {
                    var blkitm = WF.flow.items[id];
                    var link = blkitm.blockedBy[WF.pickedItem.id];
                    if (link.allowCodes != null) {
                        var curList = link.allowCodes.split(",");
                        if (curList.indexOf(act.code) >= 0) {
                            var newList = curList.filter(function(cod) {
                                return cod != act.code
                            });
                            newList.push(newCode);
                            link.allowCodes = newList.join(",");
                        }
                    }
                }
                document.getElementById("txtEditDoneCode").value = "";
                document.getElementById("txtEditDoneValue").value = "";
                app.editItem();
            }
        }
    }
    WF.drawCanvas();
}
app.askToDoSomething = function(msg, body, actionMethod, btnText, pendingAction, requirePickedItem, requireMode) {
    if (requirePickedItem && WF.pickedItem == null) return;
    if (requireMode != "" && app.mode != requireMode) return;
    app.cancelAction(false);
    var frm = document.getElementById("locGenericAction");
    var msgObj = document.getElementById("locGenericActionMessage");
    msgObj.innerHTML = msg;
    var bodyObj = document.getElementById("locGenericActionBody");
    bodyObj.innerHTML = body;
    var btn = document.getElementById("btnGenericAction");
    if (actionMethod == null) {
        btn.style.display = "none";
    } else {
        btn.style.display = "";
        btn.onclick = actionMethod;
        btn.innerHTML = btnText;
    }
    app.pendingAction = pendingAction;

    frm.style.display = "";
}
app.askToAddLink = function(type) {
    var msg = "Add " + (type == "blocks" ? "blocking " : "blocked by ") + " link to ";
    msg += "'" + WF.pickedItem.title + "' by clicking on the other item";
    app.askToDoSomething(msg, "", null, "", {action:"addLink", type:type}, true, "design");
}
app.saveEditedLink = function() {
    var blockingItem = app.pendingAction.blocking;
    var blockedItem = app.pendingAction.blocked;
    var frm = document.getElementById("locEditLink");
    var chks = frm.elements['editLinkRow[]'];
    var rslt = "";
    if (chks == undefined) {
        rslt = "";
    } else {
        if (chks.length == undefined) { // Not a list... just a ceheckbox
            if (chks.checked) rslt = chks.value;
        } else {
            for (var i = 0; i < chks.length; i++) {
                var chk = chks[i];
                if (chk.checked) {
                    if (rslt != "") rslt += ",";
                    rslt += chk.value;
                }
            }
        }
    }
    if (rslt == "") rslt = null;
    blockedItem.blockedBy[blockingItem.id].allowCodes = rslt;
    app.editItem();
    WF.drawCanvas();
    //app.toast(rslt);
}
app.editLink = function(type,toItem) {
    app.debug("Started edit link method");
    app.cancelAction();
    var blockedItem = null;
    var blockingItem = null;
    toItem = WF.flow.items[toItem];
    if (type == "blocks") {
        blockedItem = toItem;
        blockingItem = WF.pickedItem;
    } else {
        blockedItem = WF.pickedItem;
        blockingItem = toItem;
    }
    var tbl = document.getElementById("tbl_link_codes");
    while (tbl.rows.length > 0) tbl.deleteRow(0);
    var numCodes = 0;
    for (var key in blockingItem.doneCodes) {
        var oneCode = blockingItem.doneCodes[key];
        numCodes++;
        var chk = false; // See if this code is already marked as an allowed code
        var allowCodes = blockedItem.blockedBy[blockingItem.id].allowCodes;
        if (allowCodes != null) {
            var lst = allowCodes.split(",");
            if (lst.indexOf(key) >= 0) chk = true;
        }
        var tr = tbl.insertRow();
        var td = tr.insertCell();
        td.style.width = "1.5em";
        var cbox = document.createElement("input");
        cbox.checked = chk;
        cbox.type = "checkbox";
        cbox.name = "editLinkRow[]";
        cbox.value = key;
        td.appendChild(cbox);
        td = tr.insertCell();
        td.innerHTML = key + ": '" + oneCode.value + "'";
        td.className = "anchor";
        td.onclick = function(event) {
            var td = event.srcElement;
            var tr = td.parentElement;
            var cb = tr.cells[0].children[0];
            cb.click();
        }
    }
    if (numCodes == 0) {
        app.askToRemoveLink(type, toItem.id);
    } else {
        var msg = "Edit link from '" + blockingItem.title + "' to '" + blockedItem.title + "'";
        app.pendingAction = {action:"editLink", blocked:blockedItem, blocking:blockingItem};
        document.getElementById("locEditLink").style.display = "";
        document.getElementById("locEditLinkMessage").innerHTML = msg;
        app.debug("Showing edit link dialog");
    }
}
app.askToRemoveLink = function(type, id) {
    var msg = "Remove " + (type == "blocks" ? "blocking " : "blocked by ") + " link to ";
    var itm = WF.flow.items[id];
    msg += "'" + itm.title + "'";
    app.askToDoSomething(msg, "", app.confirmRemoveLink, "Remove", {action:"removeLink", type:type, id:id}, true, "design");
}
app.confirmAddLink = function(itm) {
    var added = false;
    if (itm != null) {
        if (itm == WF.pickedItem) {
            app.toast("You cannot link an item to itself", true);
        } else {
            var hasDoneCodes = false;
            var action = app.pendingAction.type;
            if (action == "blocks") {
                added = WF.pickedItem.addBlock(itm);
                if (!app.isCollectionEmpty(WF.pickedItem.doneCodes))  hasDoneCodes = true;
            } else {
                added = WF.pickedItem.addBlockedBy(itm);
                if (!app.isCollectionEmpty(itm.doneCodes))  hasDoneCodes = true;
            }
            if (added) {
                WF.drawCanvas();
                app.editItem();
                if (hasDoneCodes) {
                    app.editLink(action, itm.id);
                }
            } else {
                if (!added) app.toast("Link already present", true);
            }
        }
    } else {
        app.toast("Add link cancelled");
        app.cancelAction();
    }

}
app.confirmRemoveLink = function() {
    var type = app.pendingAction.type;
    var id = app.pendingAction.id;
    if (type == "blocks") {
        WF.pickedItem.removeBlock(WF.flow.items[id]);
    } else {
        WF.pickedItem.removeBlockedBy(WF.flow.items[id]);
    }
    WF.drawCanvas();
    app.editItem();
    app.cancelAction();
}
app.askToStartNew = function() {
    var msg = "Be sure you have saved your work!!";
    app.askToDoSomething(msg, "", app.confirmStartNew, "Clear and Start Fresh", null, false, "");
}
app.confirmStartNew = function() {
    WF.pickedItem = null;
    WF.flow = {
        title: "",
        items: {}
    }
    app.cancelAction();
    //document.getElementById("wf_title").value = WF.flow.title;
    WF.drawCanvas();
    app.setMode("design");
    app.askToAddNewItem();
}
app.askToDeleteItem = function() {
    var msg = "Confirm deleting item ";
    if (WF.pickedItem != null) msg += "'" + WF.pickedItem.title + "'";
    app.askToDoSomething(msg, "", app.confirmDeleteItem, "Delete", {action:"deleteItem"}, true, "design");
}
app.confirmDeleteItem = function() {
    WF.pushTransaction();
    var itm = WF.pickedItem;
    for (var id in WF.flow.items) {
        var other = WF.flow.items[id];
        other.removeBlockedBy(itm);
        other.removeBlock(itm);
    }
    delete WF.flow.items[itm.id];
    WF.pickedItem = null;
    WF.popTransaction();
    app.editItem();
    app.cancelAction();
}
app.cancelAction = function(showInstructions) {
    app.debug("Cancel Action (instructions: " + showInstructions + ")");
    var forceInstructions = (showInstructions != undefined);
    if (showInstructions == undefined) showInstructions = false;
    app.pendingAction = null;
    document.getElementById("locGenericAction").style.display = "none";
    document.getElementById("locConfirmAddItem").style.display = "none";
    document.getElementById("locLoadLocal").style.display = "none";  
    document.getElementById("locEditDoneCode").style.display = "none";
    document.getElementById("locEditLink").style.display = "none";  
    document.getElementById("locSaveLocal").style.display = "none"; 
    document.getElementById("locSnapshot").style.display = "none"; 
    

    document.getElementById("locInstructionsWorking").style.display = "none";
    document.getElementById("locInstructionsDesign").style.display = "none";
    
    var show = false;
    if (forceInstructions && showInstructions) {
        show = true;
    } else if (!forceInstructions && WF.pickedItem == null) {
        show = true;
    }
    if (show) {
        if (app.mode == "work") {
            document.getElementById("locInstructionsWorking").style.display = "";
        } else {
            document.getElementById("locInstructionsDesign").style.display = "";                    
        }
    }
}
app.updateWFTitle = function(el) {
    WF.flow.title = el.value;
    WF.drawCanvas();
}
app.updateItemTitle = function(el) {
    WF.pickedItem.title = el.value;
    WF.drawCanvas();
}
app.updateInstructions = function(el) {
    var inst = el.value.trim();
    if (inst == "") {
        delete WF.pickedItem.instructions;
    } else {
        WF.pickedItem.instructions = inst;
    }
    app.saveLocal(); // No need to redraw
}
app.cycleItemShape = function() {
    if (WF.pickedItem == null) return;
    if (app.mode == "work") return;
    var sel = document.getElementById("item_shape");
    var lastOption = sel.options.length - 1;
    if (sel.selectedIndex < lastOption) {
        sel.selectedIndex++;
    } else {
        sel.selectedIndex = 0;
    }
    app.updateItemShape(sel);
}
app.updateItemShape = function(el) {
    WF.pickedItem.shape = el.value;
    WF.drawCanvas();
}
app.updateItemFill = function(fill) {
    WF.pickedItem.fill = fill;
    WF.drawCanvas();
}
app.updateBlockType = function(el) {
    WF.pickedItem.unblockIfAnyCompleted = (el.value == "any");
    app.editItem();
    WF.drawCanvas();
}
app.updateItemComplete = function(el) {
    var val = el.value;
    if (!app.isCollectionEmpty(WF.pickedItem.doneCodes)) {
        if (val == '') {
            WF.pickedItem.doneCode = null;
            WF.pickedItem.completed = false;
        } else {
            WF.pickedItem.doneCode = val;
            WF.pickedItem.completed = true;
        }
    } else {
        WF.pickedItem.completed = (val != '');
    }
    app.setFutureItemsIncomplete();
    app.editItem();
    WF.drawCanvas();
}
app.askToSaveFlow = function() {
    WF.pickedItem = null;
    WF.drawCanvas();
    app.hideEditor();
    app.cancelAction(false);
    document.getElementById("locSaveLocal").style.display = "";
    var loc = document.getElementById("locDownloadSummary");
    var h = "<ul><li>File name: " + WF.flow.title + ".flow</li>";
    h += "<li>Items: " + app.collectionSize(WF.flow.items) + "</li>";
    h += "</ul>";
    loc.innerHTML = h;

    document.getElementById("locSaveToClipboard").value = JSON.stringify(WF.flow);
}
app.askToLoadFlow = function(clearContents) {
    WF.pickedItem = null;
    WF.drawCanvas();
    app.hideEditor();
    app.cancelAction(false);
    document.getElementById("locLoadLocal").style.display = "";
    if (clearContents == undefined) clearContents = true;
    if (clearContents) document.getElementById("locLoadFromClipboard").value = "";
}
app.saveLocal = function() {
    if (WFUI.dragstart != null) return;
    var sel = document.getElementById("selLoadLocal");
    var slot = sel.value;
    var optnum = sel.selectedIndex;
    var opt = sel.options[optnum];
    var title = WF.flow.title;
    if (WF.flow.title == "" && app.isCollectionEmpty(WF.flow.items)) {
        app.localStorage.slots[slot] = null;
        title = "";
    } else if (WF.flow.title == "" && !app.isCollectionEmpty(WF.flow.items)) {
        app.localStorage.slots[slot] = WF.flow;
        title = "untitled";
    } else {
        app.localStorage.slots[slot] = WF.flow;
    }
    opt.innerHTML = (optnum+1) + ". " + title;
    app.localStorage.slot = slot;
    var string = JSON.stringify(app.localStorage);
    localStorage.setItem("WF2_FLOWDATA", string);
}
app.loadFromTextbox = function() {
    app.saveLocal();
    var json = document.getElementById("locLoadFromClipboard").value.trim();
    if (json == "") json = "This should not load";
    WF.flow = {
        title: "Workflow Sample",
        items: {}
    }
    WF.pickedItem = null
    try {
        var tmpFlow = JSON.parse(json);
        var sel = document.getElementById("selLoadLocal");
        sel.options[sel.selectedIndex].innerHTML = tmpFlow.title;
        WF.pushTransaction();
        WF.flow.title = tmpFlow.title;
        for (var id in tmpFlow.items) {
            var tmpItm = tmpFlow.items[id];
            var itm = new WFItem(tmpItm.x, tmpItm.y, tmpItm.shape, tmpItm.title);
            if (tmpItm.fill != undefined) itm.fill = tmpItm.fill;
            WF.flow.items[id] = itm;
            itm.id = id;
            if (tmpItm.instructions != undefined) itm.instructions = tmpItm.instructions;
            itm.completed = tmpItm.completed;
            itm.doneCodes = tmpItm.doneCodes;
            itm.doneCode = tmpItm.doneCode;
            itm.unblockIfAnyCompleted = tmpItm.unblockIfAnyCompleted;
            itm.blockedBy = tmpItm.blockedBy;
            itm.blocks = tmpItm.blocks;
        }
        WF.popTransaction();
        app.toast("Loaded!");
    } catch(err) {
        app.loadLocal(true); // Restore what was there
        app.toast("Error loading contents of text area", true);
        WF.popTransaction(); // Probably failed after push transaction
        app.askToLoadFlow(false);
    }
}
app.loadLocal = function(remainInCurrentMode) {
    if (remainInCurrentMode == undefined) remainInCurrentMode = false;
    var sel = document.getElementById("selLoadLocal");
    var spot = parseInt(sel.value,10);
    if (spot == "") return;
    var tmpFlow = app.localStorage.slots[spot];
    WF.flow = { title: "", items: {} }
    WF.pickedItem = null;
    try {
        WF.createCanvas();
        tmpFlow.slot = spot;
        WF.pushTransaction();
        WF.flow.title = tmpFlow.title;
        for (var id in tmpFlow.items) {
            var tmpItm = tmpFlow.items[id];
            var itm = new WFItem(tmpItm.x, tmpItm.y, tmpItm.shape, tmpItm.title);
            if (tmpItm.fill != undefined) itm.fill = tmpItm.fill;
            WF.flow.items[id] = itm;
            itm.id = id;
            if (tmpItm.instructions != undefined) itm.instructions = tmpItm.instructions;
            itm.completed = tmpItm.completed;
            itm.doneCodes = tmpItm.doneCodes;
            itm.doneCode = tmpItm.doneCode;
            itm.unblockIfAnyCompleted = tmpItm.unblockIfAnyCompleted;
            itm.blockedBy = tmpItm.blockedBy;
            itm.blocks = tmpItm.blocks;
        }
        WF.popTransaction();
    } catch(err) {
        WF.popTransaction(); // Probably failed after push transaction
    }
    if (spot != undefined) {
        var count = app.collectionSize(WF.flow.items);
        if (count == 0) {
            count = "no items";
            if (!remainInCurrentMode) app.setMode("design");
        } else if (count == 1) {
            count = "1 item";
            if (!remainInCurrentMode) app.setMode("work");
        } else {
            count += " items";
            if (!remainInCurrentMode) app.setMode("work");
        }

        app.toast("Loaded #" + spot + ". '" + WF.flow.title + "' with " + count);
    }

    if (app.isCollectionEmpty(WF.flow.items)) {
        if (app.mode == "work") {
            app.askToLoadFlow();
        }
    }
    app.cancelAction();
    app.hideEditor();
    app.pickNext();
    document.activeElement.blur();
}
app.setFutureItemsIncomplete = function(itm) {
    var calledWithItem = (!itm == undefined);
    if (itm == undefined) itm = WF.pickedItem;
    for (var key in itm.blocks) {
        var bby = WF.flow.items[key];
        var okToCancel = true;
        if (bby.unblockIfAnyCompleted) {
            for (var key2 in bby.blockedBy) {
                var backone = WF.flow.items[key2];
                if (backone.id != bby.id) {
                    if (backone.completed) {
                        var b1Done = backone.doneCode;
                        var link = bby.blockedBy[backone.id];
                        if (link.allowCodes != null) {
                            var lst = link.allowCodes.split(",");
                            if (lst.indexOf(b1Done) >= 0) {
                                okToCancel = false;
                                break;    
                            }
                        } else {
                            okToCancel = false;
                            break;
                        }
                    }
                }
            }
        }
        if (okToCancel) {
            bby.doneCode = null;
            bby.completed = false;
            app.setFutureItemsIncomplete(bby);
        }
    }
    if (!calledWithItem && WF.pickedItem.completed) {
        // If the only item left does not have any blocks
        // then it can just be completed
        if (app.collectionSize(WF.pickedItem.doneCodes) < 2) {
            // Simple complete true/false
            for (var bid in WF.pickedItem.blocks) {
                var blk = WF.flow.items[bid];
                if (app.isCollectionEmpty(blk.blocks)) {
                    if (blk.unblockIfAnyCompleted) {
                        // ANY is set, and we already know THIS one has
                        // been completed, so we are ready to mark as complete
                        blk.doneCode = null;
                        blk.completed = true;
                    } else {
                        var alldone = true; // toggle if any are incomplete
                        for (var backid in blk.blockedBy) {
                            var back = WF.flow.items[backid];
                            if (!back.completed) {
                                alldone = false;
                                break;
                            }
                        }
                        if (alldone) {
                            blk.doneCode = null;
                            blk.completed = true;
                        }
                    }
                }
            }
        } else {
            // Multiple done codes
            var done = WF.pickedItem.doneCode;
            for (var id in WF.pickedItem.blocks) {
                var blk = WF.flow.items[id];
                var link = blk.blockedBy[WF.pickedItem.id];
                var acodes = [];
                if (link.allowCodes == null) {
                    acodes.push(done);
                } else {
                    acodes = link.allowCodes.split(",");
                }
                if (acodes.indexOf(done) >= 0) {
                    if (app.isCollectionEmpty(blk.blocks)) {
                        if (blk.unblockIfAnyCompleted) {
                            // ANY is set, and we already know THIS one has
                            // been completed, so we are ready to mark as complete
                            blk.doneCode = null;
                            blk.completed = true;
                        } else {
                            var alldone = true; // toggle if any are incomplete
                            for (var backid in blk.blockedBy) {
                                var back = WF.flow.items[backid];
                                if (!back.completed) {
                                    alldone = false;
                                    break;
                                }
                            }
                            if (alldone) {
                                blk.doneCode = null;
                                blk.completed = true;
                            }
                        }
                    }
                }
            }
        }
        
        WF.drawCanvas();
    }
}
app.collectionItem = function(col, pos) {
    return Object.keys(col)[pos];
}
app.collectionSize = function(col) {
    return Object.keys(col).length;
}
app.isCollectionEmpty = function(col) {
    return (app.collectionSize(col) == 0);
}
app.isOneOf = function(val,opts) {
    return opts.toUpperCase().split(",").indexOf(val.toUpperCase()) >= 0;
}

app.updateLocalStorage = function() {
    localStorage.removeItem("WF2_FLOW_WORKING");
    for (var i = 0; i < 10; i++) {
        localStorage.removeItem("WF2_FLOW_" + i);
    }
}

app.popupSaveWFTitle = function() {
    var frm = document.getElementById("BW_WF2_POPUPFORM");
    var tbox = frm.elements["TEST_INPUT"];
    app.updateWFTitle(tbox);
    app.closePopup();
}
app.popupWFTitle = function() {
    WF.pickedItem = null;
    WF.drawCanvas();
    app.cancelAction(true);
    var frm = document.getElementById("BW_WF2_POPUPFORM");
    if (frm != undefined) document.body.removeChild(frm);
    frm = document.createElement("form");
    var canBB = WFUI.canvas.getBoundingClientRect();
    frm.style.position = "absolute";
    frm.style.top = (canBB.top + 10) + "px";
    frm.style.left = canBB.left + "px";
    frm.style.zIndex = 50;
    frm.onsubmit = function(event) {
        event.preventDefault;
        testInput();
    }
    frm.id = "BW_WF2_POPUPFORM";
    var tbox = document.createElement("input");
    tbox.style.width = (WFUI.canvas.width) + "px";
    tbox.style.fontSize = "20pt";
    tbox.style.textAlign = "center";
    tbox.value = WF.flow.title;
    tbox.name = "TEST_INPUT";
    frm.appendChild(tbox);
    var btn = document.createElement("button");
    btn.onclick = app.popupSaveWFTitle;
    btn.innerHTML = "Save";
    frm.appendChild(btn);
    document.body.appendChild(frm);
    tbox.select(); tbox.focus();
}
app.closePopup = function() {
    var frm = document.getElementById("BW_WF2_POPUPFORM");
    if (frm != undefined) document.body.removeChild(frm);
}

app.clickShift = function(event) {
	var td = event.srcElement;
	var tr = td.parentElement;
	var rn = tr.rowIndex;
	var cn = td.cellIndex;
	if (rn != undefined && cn != undefined) {
		if (rn == 0) {
			if (cn == 0) app.shiftAll("UL")
			else if (cn == 1) app.shiftAll("U")
			else if (cn == 2) app.shiftAll("UR");
		} else if (rn == 1) {
            if (cn == 0) app.shiftAll("L")
            else if (cn == 1) app.shiftCenter();
			else if (cn == 2) app.shiftAll("R");
		} else if (rn == 2) {
			if (cn == 0) app.shiftAll("DL")
			else if (cn == 1) app.shiftAll("D")
			else if (cn == 2) app.shiftAll("DR");
		}
	}
}
app.shiftCenter = function() {
    var minx = 10000;
    var maxx = 0;
    var miny = 10000;
    var maxy = 0;
    for (var id in WF.flow.items) {
        var itm = WF.flow.items[id];
        if (itm.x < minx) minx = itm.x;
        if (itm.x > maxx) maxx = itm.x;
        if (itm.y < miny) miny = itm.y;
        if (itm.y > maxy) maxy = itm.y;
    }
    var width = maxx - minx;
    var left = ((WFUI.canvas.width / app.scale) - width) / 2;
    left = (WF.gridsize * parseInt(left / WF.gridsize));

    var xoff = left - minx;
    var yoff = 120 - miny; // Leaving room for title

    for (var id in WF.flow.items) {
        var itm = WF.flow.items[id];
        itm.x += xoff;
        itm.y += yoff;
    }
    WF.drawCanvas();
}
app.shiftItem = function(dir) {
    if (app.mode == "work") return;
    if (WF.pickedItem == null) return;
    // If x and y are null then we are shifting everything
    var off = WF.gridsize;
    var xoff = 0;
    var yoff = 0;
    if (dir == "L") xoff = -off;
    if (dir == "R") xoff = off;
    if (dir == "U") yoff = -off;
    if (dir == "D") yoff = off;
    var canShift = true;
    var itm = WF.pickedItem;
    var test = itm.x + xoff;
    if (test < 0 || test > (WFUI.canvas.width / app.scale)) canShift = false;
    if (canShift) {
        test = itm.y + yoff;
        if (test < 0 || test > (WFUI.canvas.height / app.scale)) canShift = false;
    }
    if (canShift) {
        itm.x += xoff;
        itm.y += yoff;
        WF.drawCanvas();
    } else {
        app.toast("Shifting would make the item go off page. Shift cancelled.", true);
    }
}
app.shiftAll = function (dirs) {
    // If x and y are null then we are shifting everything
    var off = WF.gridsize;
    var xoff = 0;
    var yoff = 0;
    if (app.isOneOf(dirs, "UL,L,DL")) xoff = -off;
    if (app.isOneOf(dirs, "UR,R,DR")) xoff = off;
    if (app.isOneOf(dirs, "UL,U,UR")) yoff = -off;
    if (app.isOneOf(dirs, "DL,D,DR")) yoff = off;
    var canShift = true;
    for (var id in WF.flow.items) {
        var itm = WF.flow.items[id];
        var test = itm.x + xoff;
        if (test < 0 || test > (WFUI.canvas.width / app.scale)) canShift = false;
        if (canShift) {
            test = itm.y + yoff;
            if (test < 0 || test > (WFUI.canvas.height / app.scale)) canShift = false;
        }
        if (!canShift) break;
    }
    if (canShift) {
        for (var id in WF.flow.items) {
            var itm = WF.flow.items[id];
            itm.x += xoff;
            itm.y += yoff;
        }
        WF.drawCanvas();
    } else {
        app.toast("Shifting would make items go off page. Shift cancelled.", true);
    }
}
app.showSnapshot = function() {
    app.cancelAction(false);
    app.hideEditor();
    var cbox = document.getElementById("chkSnapshotIncludeTitle");
    // get image data
    var itm = WF.pickedItem;
    WF.pickedItem = null;
    app.snapshotMode = true;
    WF.drawCanvas()
    app.snapshotMode = false;
    var extents = app.canvasExtents(cbox.checked);
    var imgData = WFUI.ctx.getImageData(extents.minX, extents.minY, extents.maxX, extents.maxY);

    // create image element
    var snap = document.getElementById("imgSnapshot");
    var canvas = document.createElement('canvas');
    var ctx = canvas.getContext('2d');
    canvas.width = extents.maxX - extents.minX;
    canvas.height = extents.maxY - extents.minY;
    ctx.clearRect(0,0,canvas.width,canvas.height);
    ctx.putImageData(imgData, 0, 0);
    snap.src = canvas.toDataURL("image/gif"); //image URL
    WF.pickedItem = itm;
    WF.drawCanvas()
    document.getElementById("locSnapshot").style.display = "";
}
app.canvasExtents = function(withTitle) {
    if (withTitle == undefined) withTitle = true;
    var rslt = {
        minX: 99999, maxX: 0,
        minY: 99999, maxY: 0
    }
    var title = WF.flow.title;
    if (app.isCollectionEmpty(WF.flow.items)) {
        rslt.minX = app.page.x / 2;
        rslt.maxX = app.page.x / 2;
        rslt.minY = 0;
        rslt.maxY = 0;
        if (title == "") title = app.emptyTitle;
    } else {
        if (title == "") title = "<untitled>";
    }
    for (var id in WF.flow.items) {
        var itm = WF.flow.items[id];
        rslt.minX = Math.min(rslt.minX, itm.x);
        rslt.maxX = Math.max(rslt.maxX, itm.x);
        rslt.minY = Math.min(rslt.minY, itm.y);
        rslt.maxY = Math.max(rslt.maxY, itm.y);
    }
    rslt.minX -= (WFUI.shapeWidth / 2) + 10;
    rslt.maxX += (WFUI.shapeWidth / 2) + 10;
    rslt.minY -= (WFUI.shapeHeight / 2 + 10);
    rslt.maxY += (WFUI.shapeHeight / 2 + 10);
    if (withTitle) {
        var ctx = WFUI.ctx;
        ctx.save();
        ctx.font = "20pt Arial";
        var w = ctx.measureText(title).width;
        rslt.minX = Math.min(rslt.minX, ((app.page.x - w) / 2) - 10);
        rslt.maxX = Math.max(rslt.maxX, app.page.x - ((app.page.x - w) / 2) + 10);
        rslt.minY = 0;
        ctx.restore();
    }
    rslt.minX = rslt.minX * app.scale;
    rslt.maxX = rslt.maxX * app.scale;
    rslt.minY = rslt.minY * app.scale;
    rslt.maxY = rslt.maxY * app.scale;
    return rslt;
}
app.toggleComplete = function(link) {
    if (WF.pickedItem == null) return;
    if (WF.pickedItem.isBlocked()) return;
    var itm = WF.pickedItem;
    var codes = [];
    for (var key in itm.doneCodes) {
        codes.push(key);
    }
    if (link != undefined) {
        if (link.allowCodes != null) {
            codes = link.allowCodes.split(",");
        }
    }
    if (codes.length == 0) {
        itm.completed = !itm.completed;
        itm.doneCode = null;
        app.setFutureItemsIncomplete();
        app.editItem();
        WF.drawCanvas();
    } else {
        if (itm.doneCode == null) {
            itm.completed = true;
            itm.doneCode = codes[0];
        } else {
            var curPos = -1;
            for (var i = 0; i < codes.length; i++) {
                var code = codes[i];
                if (code == itm.doneCode) curPos = i;
            }
            var next = codes[curPos+1];
            if (next == null) {
                // no more in the list
                if (link == undefined) {
                    itm.completed = false;
                    itm.doneCode = null;
                } else {
                    itm.completed = true;
                    itm.doneCode = codes[0];
                }
            } else {
                itm.completed = true;
                itm.doneCode = next;
            }
        }
        app.setFutureItemsIncomplete();
        app.editItem();
        WF.drawCanvas();
    }    
}

app.pickNext = function() {
    // if current is complete, try to find in blocks list
    if (WF.pickedItem != null && WF.pickedItem.completed) {
        for (var key in WF.pickedItem.blocks) {
            var itm = WF.flow.items[key];
            if (!itm.completed && !itm.isBlocked()) {
                WF.pickedItem = itm;
                app.editItem();
                WF.drawCanvas();
                return;
            }
        }
    }
    // collect all unblocked
    // cycle through each of them. At any point, if that
    // one is not current, pick it
    var itms = [];
    for (var key in WF.flow.items) {
        var itm = WF.flow.items[key];
        if (!itm.completed && !itm.isBlocked()) {
            itms.push(itm);
        }
    }
    itms.sort(function(a,b) {
        return a.id > b.id;
    });
    for (var i = 0; i < itms.length; i++) {
        var itm = itms[i];
        if (itm != WF.pickedItem) {
            WF.pickedItem = itm;
            app.editItem();
            WF.drawCanvas();
            break;
        }
    }
    
    // Stay where we are
}
