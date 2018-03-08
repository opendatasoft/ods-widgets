//- ODS Custom Theme
(function () {
    document.body.addEventListener("click", function (event) {
        if (event.target.className.includes('ng-binding')) {
            toggle(menuSidebar, menuActive, btnMenu, headerBtnActive, 1);
        }
    });
})();

var helpHubSidebar  = "ods__documentation-help-hub-sidebar"
    menuSidebar     = "ods__theme-sidebar"
    helpHubActive   = "help-hub-active"
    menuActive      = "menu-active"
    btnHelpHub      = "help-hub-button"
    btnMenu         = "nav-button"
    headerBtnActive = "ods__documentation-header-btn-active";

function toggle (a, b, c, d, e) {
    if (e == 0) {
        document.getElementsByClassName(a)[0].classList.add(b);
        document.getElementById(c).classList.add(d);
    } else if (e == 1) {
        document.getElementsByClassName(a)[0].classList.remove(b);
        document.getElementById(c).classList.remove(d);
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