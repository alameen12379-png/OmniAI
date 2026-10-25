/* =========================================
   YOUNGSTAR X7
   JAVASCRIPT
========================================= */


/* =========================================
   CONSTANT WORDS
========================================= */

const words = [
    "Web Developer",
    "UI/UX Designer",
    "Creative Coder",
    "Digital Creator",
    "Content Creator"
];


/* =========================================
   CONSTANT ELEMENTS
========================================= */

const typingText = document.getElementById("typingText");

const menuBtn = document.getElementById("menuBtn");

const navLinks = document.getElementById("navLinks");

const navItems = document.querySelectorAll(".nav-link");

const counters = document.querySelectorAll(".counter");

const backToTop = document.getElementById("backToTop");

const contactForm = document.getElementById("contactForm");

const formMessage = document.getElementById("formMessage");

const year = document.getElementById("year");


/* =========================================
   TYPING ANIMATION
========================================= */

let wordIndex = 0;

let characterIndex = 0;

let deleting = false;


function typeAnimation() {

    const currentWord = words[wordIndex];

    if (!deleting) {

        typingText.textContent =
            currentWord.substring(
                0,
                characterIndex + 1
            );

        characterIndex++;

        if (characterIndex === currentWord.length) {

            deleting = true;

            setTimeout(
                typeAnimation,
                1500
            );

            return;
        }

    } else {

        typingText.textContent =
            currentWord.substring(
                0,
                characterIndex - 1
            );

        characterIndex--;

        if (characterIndex === 0) {

            deleting = false;

            wordIndex++;

            if (wordIndex >= words.length) {
                wordIndex = 0;
            }
        }
    }

    const typingSpeed = deleting ? 50 : 90;

    setTimeout(
        typeAnimation,
        typingSpeed
    );
}


typeAnimation();


/* =========================================
   MOBILE MENU
========================================= */

menuBtn.addEventListener("click", () => {

    navLinks.classList.toggle("active");

    const icon = menuBtn.querySelector("i");

    if (navLinks.classList.contains("active")) {

        icon.classList.remove("fa-bars");

        icon.classList.add("fa-xmark");

    } else {

        icon.classList.remove("fa-xmark");

        icon.classList.add("fa-bars");
    }

});


/* Close mobile menu after clicking */

navItems.forEach((item) => {

    item.addEventListener("click", () => {

        navLinks.classList.remove("active");

        const icon = menuBtn.querySelector("i");

        icon.classList.remove("fa-xmark");

        icon.classList.add("fa-bars");

    });

});


/* =========================================
   ACTIVE NAVIGATION
========================================= */

const sections = document.querySelectorAll("section[id]");


function updateActiveNavigation() {

    const scrollPosition =
        window.scrollY + 200;

    sections.forEach((section) => {

        const sectionTop = section.offsetTop;

        const sectionHeight = section.offsetHeight;

        const sectionId = section.getAttribute("id");

        if (
            scrollPosition >= sectionTop &&
            scrollPosition < sectionTop + sectionHeight
        ) {

            navItems.forEach((link) => {

                link.classList.remove("active");

            });

            const activeLink =
                document.querySelector(
                    `.nav-link[href="#${sectionId}"]`
                );

            if (activeLink) {

                activeLink.classList.add("active");
            }
        }

    });

}


window.addEventListener(
    "scroll",
    updateActiveNavigation
);


/* =========================================
   COUNTER ANIMATION
========================================= */

let countersStarted = false;


function startCounters() {

    if (countersStarted) return;

    const statsSection =
        document.querySelector(".stats-section");

    const sectionPosition =
        statsSection.getBoundingClientRect().top;

    const screenPosition =
        window.innerHeight * 0.85;


    if (sectionPosition < screenPosition) {

        countersStarted = true;

        counters.forEach((counter) => {

            const target =
                Number(
                    counter.getAttribute(
                        "data-target"
                    )
                );

            let current = 0;

            const increment =
                Math.max(
                    1,
                    Math.ceil(target / 60)
                );


            function updateCounter() {

                current += increment;

                if (current >= target) {

                    counter.textContent =
                        target + "+";

                    return;
                }

                counter.textContent =
                    current;

                requestAnimationFrame(
                    updateCounter
                );
            }


            updateCounter();

        });
    }
}


window.addEventListener(
    "scroll",
    startCounters
);

startCounters();


/* =========================================
   BACK TO TOP
========================================= */

window.addEventListener(
    "scroll",
    () => {

        if (window.scrollY > 600) {

            backToTop.classList.add("show");

        } else {

            backToTop.classList.remove("show");
        }

    }
);


backToTop.addEventListener(
    "click",
    () => {

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    }
);


/* =========================================
   CONTACT FORM
========================================= */

contactForm.addEventListener(
    "submit",
    (event) => {

        event.preventDefault();

        const name =
            document.getElementById(
                "name"
            ).value.trim();

        const email =
            document.getElementById(
                "email"
            ).value.trim();

        const message =
            document.getElementById(
                "message"
            ).value.trim();


        if (
            name === "" ||
            email === "" ||
            message === ""
        ) {

            formMessage.textContent =
                "Please complete all fields.";

            return;
        }


        formMessage.textContent =
            `Thanks, ${name}! Your message has been received.`;

        contactForm.reset();

    }
);


/* =========================================
   CURRENT YEAR
========================================= */

year.textContent =
    new Date().getFullYear();


/* =========================================
   IMAGE PARALLAX EFFECT
========================================= */

const heroImage =
    document.querySelector(".hero-image");


document.addEventListener(
    "mousemove",
    (event) => {

        const x =
            (window.innerWidth / 2 - event.clientX) / 70;

        const y =
            (window.innerHeight / 2 - event.clientY) / 70;


        if (heroImage) {

            heroImage.style.transform =
                `translate(${x}px, ${y}px)`;
        }

    }
);


/* =========================================
   REVEAL ANIMATION
========================================= */

const revealElements =
    document.querySelectorAll(
        ".skill-card, .project-card, .about-card"
    );


const revealObserver =
    new IntersectionObserver(
        (entries) => {

            entries.forEach((entry) => {

                if (entry.isIntersecting) {

                    entry.target.style.opacity = "1";

                    entry.target.style.transform =
                        "translateY(0)";

                    revealObserver.unobserve(
                        entry.target
                    );
                }

            });

        },
        {
            threshold: 0.15
        }
    );


revealElements.forEach((element) => {

    element.style.opacity = "0";

    element.style.transform =
        "translateY(30px)";

    element.style.transition =
        "opacity 0.7s ease, transform 0.7s ease";

    revealObserver.observe(element);

});