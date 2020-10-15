var WFUI = {
    canvas: null,
    ctx: null,
    shapeWidth: 90,
    shapeHeight: 90,
    arrowRadius: 45,
    spacing: 10,
    arrowSize: {length:12, width:8},
    textColor: "#191970"
}
WFUI.showInstructions = function() {
    WFUI.addText("Better Way Workflow", 400, 80, "20pt Arial", clr);
    var txt = "Use the 'Add Item' button to the right to add flow items to the page. ";
    txt += "You may need to switch to Design mode first.";
    WFUI.addText(txt, 400, 120, "12pt Arial", "black");
}
WFUI.drawCanvas = function(items) {
    WFUI.clearCanvas();
    if (WF.flow == null || app.isCollectionEmpty(WF.flow.items)) {
        WFUI.showInstructions();
        return;
    }
    var title = WF.flow.title;
    var clr = "darkblue";
    if (title == "") {
        title = "<untitled>";
        clr = "grey";
    }
    WFUI.addText(title, 400, 40, "20pt Arial", clr);

    var ctx = WFUI.ctx;
    for (var id in items) {
        var itm = WF.flow.items[id];
        for (var cnum in itm.blockedBy) {
            var bby = itm.blockedBy[cnum];
            var bstep = WF.flow.items[cnum];

            var txt = "";
            var foundDoneCode = false;
            if (bby.allowCodes != null) {
                var lst = bby.allowCodes.split(",");
                for (var acnum = 0; acnum < lst.length; acnum++) {
                    if (txt != "") txt += ",";
                    var code = lst[acnum];
                    if (code == bstep.doneCode) {
                        foundDoneCode = true;
                        txt += "[" + code + "]";
                    } else {
                        txt += code;
                    }
                }
                if (txt == "") txt = "??";
            }
            var arrowDone = false;
            if (bstep.completed) {
                if (bstep.doneCode == null) {
                    arrowDone = true;
                } else {
                    arrowDone = foundDoneCode;
                }
            }

            ctx.save();
            ctx.beginPath();
            ctx.moveTo(itm.x, itm.y);
            ctx.lineTo(bstep.x, bstep.y);
            ctx.strokeStyle = (arrowDone ? app.colors.doneLine : app.colors.notDoneLine);
            ctx.lineWidth = (arrowDone ? 3 : 1);
            ctx.stroke();
            ctx.restore();

            WFUI.drawArrowAtEnd(itm.x, itm.y, bstep.x, bstep.y, txt, arrowDone);
        }
    }

    var dragger = WFUI.dragstart == null ? null : WFUI.dragstart.item;
    for (var id in items) {
        var itm = items[id];
        //if (itm != dragger) {
            WFUI.drawShape(itm, dragger);
        //}
    }
}

WFUI.clearCanvas = function() {
    var ctx = WFUI.ctx;
    ctx.clearRect(0,0,WFUI.canvas.width, WFUI.canvas.height);
}

WFUI.drawShape = function(itm, draggingItem) {
    if (draggingItem == undefined) draggingItem = null;
    //return; // DEBUGGING
    if (itm.shape == "pill") {
        WFUI.drawShapePill(itm, draggingItem);
    } else if (itm.shape == "diamond") {
        WFUI.drawShapeDiamond(itm, draggingItem);
    } else if (itm.shape == "circle") {
        WFUI.drawShapeCircle(itm, draggingItem);
    } else if (itm.shape == "stop") {
        WFUI.drawShapeStop(itm, draggingItem);
    } else { // Default to box
        WFUI.drawShapeBox(itm, draggingItem);
    }

}
WFUI.drawShapeStop = function(itm, draggingItem) {
    var ctx = WFUI.ctx;
    var x = itm.x;
    var y = itm.y;
    var r = WFUI.shapeWidth / 2;
    ctx.save();
    ctx.beginPath();
    WFUI.setStyle(ctx, itm, draggingItem);
    //ctx.lineWidth = 2;
    //ctx.strokeStyle = "red";
    WFUI.drawSidedShape(x, y, 8, r);
    if (itm.completed) ctx.fillStyle = "firebrick";
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    WFUI.addTextToShape(itm, "bold 10pt Arial", (itm.completed ? "white" : app.colors.notDoneLine));  
}
WFUI.drawShapeCircle = function(itm, draggingItem) {
    var ctx = WFUI.ctx;
    var x = itm.x;
    var y = itm.y;
    var r = WFUI.shapeWidth / 2;
    ctx.save();
    ctx.beginPath();
    WFUI.setStyle(ctx, itm, draggingItem);
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    WFUI.addTextToShape(itm);  
}

WFUI.drawShapeBox = function(itm, draggingItem) {
    var ctx = WFUI.ctx;
    var x = itm.x;
    var y = itm.y;
    var left = x - (WFUI.shapeWidth / 2);
    var w = WFUI.shapeWidth;
    var h = WFUI.shapeWidth;
    var top = y - (h / 2);
    var r = 4; // Corner radius
    ctx.save();
    ctx.beginPath();
    WFUI.setStyle(ctx, itm, draggingItem);
    ctx.moveTo(left + w - r, top); // top right minus radii
    ctx.arcTo(left + w, top, left + w, top + r, r);
    ctx.lineTo(left + w, top + h - r);
    ctx.arcTo(left + w, top + h, left + w - r, top + h, r);
    ctx.lineTo(left + r, top + h);
    ctx.arcTo(left, top + h, left, top + h - r, r);
    ctx.lineTo(left, top + r);
    ctx.arcTo(left, top, left + r, top, r);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    WFUI.addTextToShape(itm);  
}
WFUI.drawShapePill = function(itm, draggingItem) {
    var ctx = WFUI.ctx;
    var x = itm.x;
    var y = itm.y;
    var pillLeft = x - (WFUI.shapeWidth / 2);
    var pillWidth = WFUI.shapeWidth;
    var pillHeight = WFUI.shapeHeight * 2 / 3;
    var pillTop = y - (pillHeight / 2);
    ctx.save();
    ctx.beginPath();
    WFUI.setStyle(ctx, itm, draggingItem);
    ctx.moveTo(pillLeft + pillWidth - (pillHeight/2), pillTop); // top edge minus radii
    ctx.arcTo(pillLeft + pillWidth, pillTop, pillLeft + pillWidth, pillTop + (pillHeight/2), pillHeight/2);
    ctx.arcTo(pillLeft + pillWidth, pillTop + pillHeight, pillLeft + pillWidth - (pillHeight/2), pillTop + pillHeight, pillHeight/2);
    ctx.lineTo(pillLeft + (pillWidth/2), pillTop + pillHeight);
    ctx.arcTo(pillLeft, pillTop + pillHeight, pillLeft, pillTop + (pillHeight/2), pillHeight/2);
    ctx.arcTo(pillLeft, pillTop, pillLeft + (pillHeight/2), pillTop, pillHeight/2);
    ctx.closePath();
    if (itm.completed && app.isCollectionEmpty(itm.blocks)) ctx.fillStyle = app.colors.pillDone;

    ctx.fill();
    ctx.stroke();
    ctx.restore();
    WFUI.addTextToShape(itm);
}
WFUI.drawShapeDiamond = function(itm, draggingItem) {
    var ctx = WFUI.ctx;
    var x = itm.x;
    var y = itm.y;
    var left = x - (WFUI.shapeWidth / 2);
    var w = WFUI.shapeWidth;
    var h = WFUI.shapeWidth;
    var top = y - (h / 2);
    ctx.save();
    ctx.beginPath();
    WFUI.setStyle(ctx, itm, draggingItem);
    ctx.moveTo(left + (w/2), top);
    ctx.lineTo(left + w, top + (h/2));
    ctx.lineTo(left + (w/2), top + h);
    ctx.lineTo(left, top + (h/2));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    WFUI.addTextToShape(itm);
}
WFUI.setStyle = function(ctx, itm, draggingItem) {
    //ctx.strokeStyle = "black";
    if (itm == undefined) {
        itm = {completed:false, blockedBy:[]}
    }
    if (itm == draggingItem) {
        ctx.lineWidth = 2;
        ctx.shadowOffsetX = 8;
        ctx.shadowOffsetY = 8;
        ctx.shadowBlur = 5;
        ctx.shadowColor = "rgba(0, 0, 0, 0.3)";
        ctx.fillStyle = app.colors.dragFill;
    } else {
        if (itm == WF.pickedItem) {
            ctx.shadowBlur = 25;
            ctx.shadowColor = app.colors.halo;
        }
        ctx.lineWidth = .5;
        if (itm.completed) {
            ctx.strokeStyle = app.colors.doneLine;
            ctx.fillStyle = app.colors.doneFill;
        } else {
            ctx.strokeStyle = app.colors.notDoneLine;
            ctx.fillStyle = itm.isBlocked() ? app.colors.blockedFill : app.colors.activeFill;
        }
    }

}
WFUI.addTextToShape = function(itm, font, color) {
    if (color == undefined) color = (itm.completed ? "black" : app.colors.notDoneLine);
    if (font == undefined) font = "9pt Arial";
    //WFUI.addText(itm.title, itm.x, itm.y + 5, font);
    WFUI.wrapText(itm.title, itm.x, itm.y, WFUI.shapeWidth - 6, color, 10, "Arial");
}
WFUI.wrapText = function(text, x, y, maxWidth, color, fontSize, fontFace){
    var words = text.split(' ');
    var lines = [];
    var line = '';
    var ctx = WFUI.ctx;
    ctx.save();
    ctx.font = fontSize + "pt " + fontFace;  
    ctx.fillStyle = color;
    for(var n = 0; n < words.length; n++) {
        var testLine = line + words[n] + ' ';
        var metrics = ctx.measureText(testLine);
        var testWidth = metrics.width;
        if(testWidth > maxWidth) {
            lines.push(line);
            //context.fillText(line, x, y);
            line = words[n] + ' ';
        } else {
            line = testLine;
        }
    }
    lines.push(line);
    var lineHeight = fontSize * 1.22; // Leave spacing
    var liney = y - (lineHeight * (lines.length-1) / 2) + (fontSize / 2);
    for (var n = 0; n < lines.length; n++) {
        var metrics = ctx.measureText(lines[n]);
        ctx.fillText(lines[n], x - (metrics.width / 2), liney);
        liney += lineHeight;
    }
}
WFUI.addText = function(txt, x, y, font, color, shadowsize, shadowcolor) {
    if (color == undefined) color = WFUI.textColor;
    if (font == undefined) font = "10pt Arial";
    var ctx = WFUI.ctx;
    ctx.save();
    ctx.font = font;
    ctx.fillStyle = color;
    var xy = ctx.measureText(txt);
    var txtx = x - (xy.width / 2);
    var txty = y;
    if (shadowsize != undefined && shadowcolor != undefined) {
        ctx.shadowBlur = shadowsize;
        ctx.shadowColor = shadowcolor;
    }

    ctx.fillText(txt, txtx, txty);
    ctx.restore();    
}

WFUI.getItemUnderXY = function(x, y) {
    var itm = null;
    var halfHit = WF.pickHitBox / 2;
    for (var id in WF.flow.items) {
        var test = WF.flow.items[id];
        if (x >= (test.x - halfHit) && x <= test.x + halfHit) {
            if (y >= (test.y - halfHit) && y <= test.y + halfHit) {
                itm = test;
                //WF.dispatchEvent("itempicked", {item:itm});
                break;
            }
        }
    }
    return itm;
}
WFUI.drawSidedShape = function(x, y, sides, r) {
    var ctx = WFUI.ctx;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate((360 / sides / 2) * Math.PI / 180);
    ctx.moveTo (r * Math.cos(0), r * Math.sin(0));  
    for (var i = 1; i < sides; i += 1) {
        ctx.lineTo (r * Math.cos(i * 2 * Math.PI / sides), r * Math.sin(i * 2 * Math.PI / sides));
    }
    ctx.closePath();
    ctx.translate(-x, -y);
    ctx.rotate(0);
    ctx.restore();
}

WFUI.drawArrowAtEnd = function(x1, y1, x2, y2, txt, completed) {
    if (txt == undefined) txt = "";
    var alen = WFUI.arrowSize.length;
    var awid = WFUI.arrowSize.width;
    var angle = WFUI.lineAngle(x1, y1, x2, y2);
    var ctx = WFUI.ctx; //WorkflowUI.canvas.getContext("2d");
    ctx.save();
    ctx.beginPath();
    var mid = WFUI.lineMidpoint(x1, y1, x2, y2);
    ctx.translate(mid.x, mid.y);
    ctx.rotate(angle);
    ctx.moveTo(alen,0);
    ctx.lineTo(0, awid/2);
    ctx.lineTo(0, -awid/2);
    ctx.closePath();
    ctx.strokeStyle = (completed ? app.colors.doneLine : app.colors.notDoneLine);
    ctx.lineWidth = (completed ? 3 : 2);
    ctx.stroke();
    ctx.fillStyle = (completed ? app.colors.doneLine : app.colors.blockedFill);
    ctx.fill();
    ctx.rotate(-angle);

    if (txt != "") {
        ctx.font = "9pt Arial";
        var metrics = ctx.measureText(txt);
        var txtx = -(metrics.width / 2);
        var txty = -awid + 5;
        if (angle < 0) txty = 18;
        ctx.save();
        ctx.strokeStyle = "white";
        ctx.fillStyle = "white";
        var bclr = "rgba(255, 255, 255, .9)";
        var clr = "navy";
        if (txt == "??") {
            bclr = "red";
            clr = "yellow";
        }
        ctx.fillStyle = bclr;
        ctx.fillRect(txtx - 2, txty + 2, metrics.width + 4, -14);
        ctx.restore();

        ctx.fillStyle = clr;
        ctx.fillText(txt, txtx, txty);
    }
    
    ctx.restore();
}
WFUI.lineLength = function(x1, y1, x2, y2) {
    var a = x1 - x2;
    var b = y1 - y2;
    var c = Math.sqrt( a*a + b*b )
    return c;
}
WFUI.lineAngle = function(x1, y1, x2, y2) {
    var mx = x1 - x2;
    var my = y1 - y2;
    var angle = Math.atan2(my, mx);// * 180 * Math.PI;
    return angle;
}
WFUI.lineMidpoint = function(x1, y1, x2, y2) {
    x = (x1 + x2) / 2;
    y = (y1 + y2) / 2;
    return {x:x, y:y}
}
WFUI.lineArrowEndX = function(x1, y1, x2, y2) {
    var len = WFUI.lineLength(x1, y1, x2, y2) 
    var offset = WFUI.arrowRadius;
    return len - offset;
}
