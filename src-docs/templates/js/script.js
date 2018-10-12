//- ODS Custom Theme
//- Sidebar Menu / Sidebar Help Hub
'use strict';

(function () {

    var menuSidebar          = document.getElementsByClassName("ods-sidebar")[0],
        helpHubSidebar       = document.getElementsByClassName("ods-header__nav")[0],
        sidebarBtn           = document.getElementById("sidebar-button"),
        helpHubBtn           = document.getElementById("helphub-button"),
        contentPrincipal     = document.getElementsByClassName("ods-content")[0],
        menuActiveClass      = "ods-sidebar--active",
        helpHubActiveClass   = "ods-header__nav--active",
        headerBtnActiveClass = "ods-header__menu-toggle--active";

    function resetStateSidebar() {
        menuSidebar.classList.remove(menuActiveClass);
        helpHubSidebar.classList.remove(helpHubActiveClass);

        sidebarBtn.classList.remove(headerBtnActiveClass);
        helpHubBtn.classList.remove(headerBtnActiveClass);

        contentPrincipal.style.height = "auto";
        contentPrincipal.style.overflowY = "visible";
    }

    function toggle(sidebarElement, sidebarActiveClass, btnElement) {
        var menuHeight    = document.getElementById("sidebar-nav").clientHeight,
            helpHubHeight = document.getElementById("helphub-nav").clientHeight,

            //- Save state element
            stateElementClass  = sidebarElement.className,
            open               = stateElementClass.indexOf(menuActiveClass) === -1 && stateElementClass.indexOf(helpHubActiveClass) === -1;

        resetStateSidebar();

        if (open) {
            sidebarElement.classList.add(sidebarActiveClass);
            btnElement.classList.add(headerBtnActiveClass);

            contentPrincipal.style.overflowY = "hidden";

            if (sidebarElement.className.indexOf("ods-sidebar") > -1) {
                contentPrincipal.style.height = (menuHeight - 25) + "px";
            } else {
                contentPrincipal.style.height = (helpHubHeight - 25) + "px";
            }
        }
    }

    var navItemApi = document.getElementById("nav-api");
    var navItemTutorial = document.getElementById("nav-tutorial");
    var sidebarMenuElement = document.getElementById("sidebar-nav");
    var classActivCurrentLink = "nav-items-link-active";
    var sidebarClassSpecialTutorial = "behaviourSidebarTutorial";
    var isMobile = window.innerWidth <= 991 ? true : false;

    function activCurrentItemNav () {
        var URLpage = window.location.href.split("#")[1];

        if (URLpage.indexOf("api") > -1) {
            navItemApi.classList.add(classActivCurrentLink);
            sidebarMenuElement.classList.remove(sidebarClassSpecialTutorial);
        } else {
            navItemTutorial.classList.add(classActivCurrentLink);
            sidebarMenuElement.classList.add(sidebarClassSpecialTutorial);
        }
    }

    function resetActiveCurrentItemNav () {
        navItemApi.classList.remove(classActivCurrentLink);
        navItemTutorial.classList.remove(classActivCurrentLink);
    }

    setTimeout(function () {
        activCurrentItemNav();
    }, 100);

    $(window).bind('hashchange', function () {
        resetActiveCurrentItemNav();
        activCurrentItemNav();
    });

    document.body.addEventListener("click", function (event) {
        if (event.target.id == "sidebar-button") {
            toggle(menuSidebar, menuActiveClass, sidebarBtn);
        }

        if (event.target.id == "helphub-button") {
            toggle(helpHubSidebar, helpHubActiveClass, helpHubBtn);
        }

        if (event.target.className.indexOf("ng-binding") > -1) {
            toggle(menuSidebar, menuActiveClass, sidebarBtn);
        }

        if (event.target.className.indexOf("link_widgets") > -1 ||
            event.target.className.indexOf("link_tutorials") > -1) {
            toggleLinkHelpHub(event.target);
            toggle(helpHubSidebar, helpHubActiveClass, helpHubBtn);
        }

        if (event.target.className.indexOf("nav-items-link") > -1) {
            resetActiveCurrentItemNav();
            activCurrentItemNav();

            if (isMobile) resetStateSidebar();
        }
    });

})();
