//slide destaque
$('#slide-principal').owlCarousel({
    loop: true,
    margin: 10,
    items: 1,
    autoplay: true,
    nav: true,
    dots: false,
    autoplayTimeout: 3000,
    autoplayHoverPause: true,
    smartSpeed: 1000,
    responsiveClass: true,
    responsive: {
        0: {
            nav: false,
        },
        768: {
            nav: true,
        }
    }
})

// slide telas
$('#saas-slide').owlCarousel({
    loop: true,
    margin: 24,
    items: 1,
    autoplay: true,
    nav: true,
    dots: true,
    autoplayTimeout: 3000,
    autoplayHoverPause: true,
    smartSpeed: 1000,
    responsiveClass: true,
    responsive: {
        0: {
            items: 1,
            nav: false,
            margin: 0
        },
        768: {
            items: 2
        },
        1140: {
            items: 3,
            center: true
        }
    }
});



//contador
function contador(el, duracao = 2000) {

    const final = +el.textContent; // transforma texto em numero

    let inicio = 0; //inicia a contagem como 0

    let t0 = performance.now(); //marca o tempo da contagem com alta precisao

    function animar(t) {
        let p = Math.min((t - t0) / duracao, 1);

        el.textContent = Math.floor(p * final);

        if (p < 1) requestAnimationFrame(animar);
    }

    requestAnimationFrame(animar);

}

const obs = new IntersectionObserver(es => {
    es.forEach(e => {
        if (e.isIntersecting) {

            contador(e.target);

            obs.unobserve(e.target);

        }
    });
}, { threshold: 0.6 });

document.querySelectorAll("#contador .display-4").forEach(el => obs.observe(el));

// fim contador


// DEPOIMENTOS DO SITE
$('#depoimentos').owlCarousel({
    loop: true,
    margin: 15,
    autoplay: true,
    nav: false,
    dots: true,
    autoplayTimeout: 3000,
    autoplayHoverPause: true,
    smartSpeed: 1000,
    responsiveClass: true,
    responsive: {
        0: {
            items: 1,
            nav: false,
            margin: 0
        },
        768: {
            items: 2
        },
        1140: {
            items: 3,
            center: true
        }
    }
});