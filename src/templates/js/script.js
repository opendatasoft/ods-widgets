//- ODS Custom Theme
//- Sidebar Menu / Sidebar Help Hub
var helpHubSidebar   = "ods-helphub"
    menuSidebar      = "ods-sidebar"
    helpHubActive    = "ods-helphub--active"
    menuActive       = "ods-sidebar--active"
    btnHelpHub       = "helphub-button"
    btnMenu          = "sidebar-button"
    headerBtnActive  = "ods-header__btn--active"
    contentPrincipal = "ods-content";

function toggle (a, b, c, d, e) {
    var sidebarHeight = sidebarHeight = document.getElementById('sidebar-nav').clientHeight;

    if (e == 0) {
        document.getElementsByClassName(a)[0].classList.add(b);
        document.getElementById(c).classList.add(d);
        
        document.getElementsByClassName(contentPrincipal)[0].style.height = (sidebarHeight - 25) + "px";
        document.getElementsByClassName(contentPrincipal)[0].style.overflowY = "hidden";
    } else if (e == 1) {
        document.getElementsByClassName(a)[0].classList.remove(b);
        document.getElementById(c).classList.remove(d);

        document.getElementsByClassName(contentPrincipal)[0].style.height = "auto";
        document.getElementsByClassName(contentPrincipal)[0].style.overflowY = "visible";
    }
}

function toggleHelpHub() {
    var sidebar = document.getElementsByClassName(helpHubSidebar)[0].className
        menu    = document.getElementsByClassName(menuSidebar)[0].className;
    
    if (sidebar.includes(helpHubActive) && !menu.includes(menuActive)) {
        toggle(helpHubSidebar, helpHubActive, btnHelpHub, headerBtnActive, 1);
    } else if (!sidebar.includes(helpHubActive) && menu.includes(menuActive)) {
        toggle(helpHubSidebar, helpHubActive, btnHelpHub, headerBtnActive, 0);
        toggle(menuSidebar, menuActive, btnMenu, headerBtnActive, 1);
    } else if (!sidebar.includes(helpHubActive) && !menu.includes(menuActive)) {
        toggle(helpHubSidebar, helpHubActive, btnHelpHub, headerBtnActive, 0);
    }
}

function toggleMenu() {
    var sidebar = document.getElementsByClassName(helpHubSidebar)[0].className
        menu    = document.getElementsByClassName(menuSidebar)[0].className;

    if (!menu.includes(menuActive) && !sidebar.includes(helpHubActive)) {
        toggle(menuSidebar, menuActive, btnMenu, headerBtnActive, 0);
    } else if (!menu.includes(menuActive) && sidebar.includes(helpHubActive)) {
        toggle(menuSidebar, menuActive, btnMenu, headerBtnActive, 0);
        toggle(helpHubSidebar, helpHubActive, btnHelpHub, headerBtnActive, 1);
    } else if (menu.includes(menuActive) && !sidebar.includes(helpHubActive)) {
        toggle(menuSidebar, menuActive, btnMenu, headerBtnActive, 1);
    }
}

//- Activ link in sidebar help hub (widgets / tutorial widgets)
var itemActiv = "ods-header__nav-item--active"
    widgets   = document.getElementsByClassName("link_widgets")
    tutorials = document.getElementsByClassName("link_tutorials");

function toggleLinkActiv(a, b) {
    if (a.className.includes(itemActiv)) return null;
    else {
        a.classList.add(itemActiv);
        for (var u = 0; u < b.length; u++) {
            b[u].parentElement.classList.remove(itemActiv);
        }
    }
}

function toggleLinkHelpHub(a) {
    if (a.className == "link_widgets") {
        toggleLinkActiv(a.parentElement, tutorials);
    } else if (a.className == "link_tutorials") {
        toggleLinkActiv(a.parentElement, widgets);
    }
}

function assignHelpHubActiv() {
    var url = window.location.href.split("#")[1];

    if (url.includes("/api")) {
        for (var i = 0; i < widgets.length; i++) {
            widgets[i].parentElement.classList.add(itemActiv);
        }
    } else if (url.includes("/tutorial")) {
        for (var i = 0; i < tutorials.length; i++) {
            tutorials[i].parentElement.classList.add(itemActiv);
        }
    }
}

(function () { 

    document.body.addEventListener("click", function (event) {
        if (event.target.className.includes("ng-binding")) {
            toggle(menuSidebar, menuActive, btnMenu, headerBtnActive, 1);
        }
        if (event.target.className.includes('link_widgets') ||
            event.target.className.includes('link_tutorial')) {
            toggleLinkHelpHub(event.target);
        }
    });

    assignHelpHubActiv();

})();