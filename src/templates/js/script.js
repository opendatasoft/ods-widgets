//- ODS Custom Theme
(function () {
    var clickHandler = function () {
        console.log('Hello');
    };

    var itemMenu = document.getElementsByClassName("ng-binding");
    for (var i = 0; i < itemMenu.length; i++) {
        var current = itemMenu[i];
        current.addEventListener('click', clickHandler, false);
    }
})();

var helpHubSidebar  = "ods__documentation-help-hub-sidebar"
    menuSidebar     = "ods__theme-sidebar"
    helpHubActive   = "help-hub-active"
    menuActive      = "menu-active"
    btnHelpHub      = "help-hub-button"
    btnMenu         = "nav-button"
    headerBtnActive = "ods__documentation-header-btn-active";
//- Help hub sidebar
function openHelpHub() {
    document.getElementsByClassName(helpHubSidebar)[0].classList.add(helpHubActive);
    document.getElementById(btnHelpHub).classList.add(headerBtnActive);
}
function closeHelpHub() {
    document.getElementsByClassName(helpHubSidebar)[0].classList.remove(helpHubActive);
    document.getElementById(btnHelpHub).classList.remove(headerBtnActive);
}
//- Menu sidebar
function openMenu() {
    var elementOpenMenu = document.getElementsByClassName(menuSidebar)
        btnOpenMenu     = document.getElementById(btnMenu);
    elementOpenMenu[0].classList.add(menuActive);
    btnOpenMenu.classList.add(headerBtnActive);
}
function closeMenu() {
    var elementCloseMenu = document.getElementsByClassName(menuSidebar)
        btnCloseMenu     = document.getElementById(btnMenu);
    elementCloseMenu[0].classList.remove(menuActive);
    btnCloseMenu.classList.remove(headerBtnActive);
}
//- Main
var sidebar = document.getElementsByClassName(helpHubSidebar)
    menu    = document.getElementsByClassName(menuSidebar);
function toggleHelpHub() {
    if (sidebar[0].className.includes(helpHubActive) && !menu[0].className.includes(menuActive)) {
        closeHelpHub();
    } else if (!sidebar[0].className.includes(helpHubActive) && menu[0].className.includes(menuActive)) {
        openHelpHub();
        closeMenu();
    } else if (!sidebar[0].className.includes(helpHubActive) && !menu[0].className.includes(menuActive)) {
        openHelpHub();
    }
}
function toggleMenu() {
    if (menu[0].className.includes(menuActive) && !sidebar[0].className.includes(helpHubActive)) {
        closeMenu();
    } else if (!menu[0].className.includes(menuActive) && sidebar[0].className.includes(helpHubActive)) {
        openMenu();
        closeHelpHub();
    } else if (!menu[0].className.includes(menuActive) && !sidebar[0].className.includes(helpHubActive)) {
        openMenu();
    }
}