const _elements = {
    loading: document.querySelector(".loading"),
    switch: document.querySelector(".switch__track"),
    stateSelectToggle: document.querySelector(".state-select-toggle"),
    selectOptions: document.querySelectorAll(".state-select-list__item"),
    selectList: document.querySelector(".state-select-list"),
    selectToggleIcon: document.querySelector(".state-select-toggle__icon"),
    selectSearchBox: document.querySelector(".state-select-list__search"),
    selectStateSelected: document.querySelector(".state-select-toggle__state-selected"),
    
}


const _charts = {};

_elements.switch.addEventListener("click", () => {
    const isDark = _elements.switch.classList.toggle("switch__track--dark");

    if(isDark)
        document.documentElement.setAttribute("data-theme", "dark");
    else
        document.documentElement.setAttribute("data-theme", "light");

    updateCharts();
});

_elements.stateSelectToggle.addEventListener("click", () => {
    _elements.selectToggleIcon.classList.toggle("state-select-toggle__icon--rotate");
    _elements.selectList.classList.toggle("state-select-list--show");
});

_elements.selectOptions.forEach(item => {
    item.addEventListener("click", () => {
        _elements.selectStateSelected.innerText = item.innerText;
        _data.id = item.getAttribute("data-id");
        _elements.stateSelectToggle.dispatchEvent(new Event("click"));

        loadData(_data.id);
    });
});

_elements.selectSearchBox.addEventListener("keyup", (e) => {
    const search = e.target.value.toLowerCase();

    for(const item of _elements.selectOptions) {
        const state = item.innerText.toLowerCase();

        if(!state.includes(search)) {
            item.classList.add("state-select-list__item--hide");
        }
        else {
            item.classList.remove("state-select-list__item--hide");
        }
    }
});

const request = async (api, id) => {
    try {
        const url = api + id;
        const data = await fetch(url);
        const json = await data.json();

        return json;
    }
    catch(e) {
        console.log(e);
    }
}

const loadData = async (id) => {
    _elements.loading.classList.remove("loading--hide");

    _data.confirmed = await request(_api.confirmed, id);
    _data.deaths = await request(_api.deaths, id);
    _data.vaccinatedInfo = await request(_api.vaccinatedInfo, "");
    _data.vaccinated = await request(_api.vaccinated, id);

    updateCards();
    updateCharts();

    _elements.loading.classList.add("loading--hide");
}

const createBasicChart = (element, config) => {
    const options = {
        chart: {
            background: "transparent"
        },

        xaxis: {
            type: "datetime"
        },

        yaxis: {
            min: 0,
            labels: {
                formatter: value => parseInt(value).toLocaleString()
            }
        },

        series: []
    }

    if(config !== undefined) {
        for(key in config) {
            options[key] = config[key];
        }
    }

    const chart = new ApexCharts(document.querySelector(element), options);
    chart.render();

    return chart;
}

const createDonutChart = (element) => {
    const chart = createBasicChart(element, {
        chart: {
            height: 350,
            type: "radialBar"
        },

        plotOptions: {
            radialBar: {
                dataLabels: {
                    name: {
                        fontSize: "16px"
                    },
                    value: {
                        fontWeight: 700,
                        fontSize: "18px"
                    }
                }
            }
        }
    });

    return chart;
}

const createStackedColumnsChart = (element) => {
    const chart = createBasicChart(element, {
        chart: {
            type: "bar",
            stacked: true
        },
        dataLabels: {
            enabled: false
        }
    });

    return chart;
}

const createCharts = () => {
    _charts.confirmed = createBasicChart(".data-box--confirmed .data-box__body");
    _charts.deaths = createBasicChart(".data-box--deaths .data-box__body");
    _charts.confirmed30 = createBasicChart(".data-box--30 .data-box__body");
    _charts.vaccinatedAbs = createBasicChart(".data-box--vaccinated-abs .data-box__body");
    _charts.vaccinatedDay = createStackedColumnsChart(".data-box--vaccinated-day .data-box__body");
    _charts.vaccinatedDonut1 = createDonutChart(".data-box--vaccinated-1 .data-box__body");
    _charts.vaccinatedDonut2 = createDonutChart(".data-box--vaccinated-2 .data-box__body");
}

const updateCards = () => {
    const uf = _ufs[_data.id];

    _elements.confirmed.innerText = _data.confirmed[_data.confirmed.length-1]["total_de_casos"];
    _elements.deaths.innerText = _data.deaths[_data.deaths.length-1]["total_de_mortes"];
    _elements.vaccinated1.innerText = _data.vaccinatedInfo.extras[uf].info["total-hoje-dose-1"];
    _elements.vaccinated2.innerText = _data.vaccinatedInfo.extras[uf].info["total-hoje-dose-2"] + _data.vaccinatedInfo.extras[uf].info["total-hoje-dose-unica"];

    _elements.confirmed.innerText = parseInt(_elements.confirmed.innerText).toLocaleString();
    _elements.deaths.innerText = parseInt(_elements.deaths.innerText).toLocaleString();
    _elements.vaccinated1.innerText = parseInt(_elements.vaccinated1.innerText).toLocaleString();
    _elements.vaccinated2.innerText = parseInt(_elements.vaccinated2.innerText).toLocaleString();
}

const updateCharts = () => {
    const style = getComputedStyle(document.documentElement);
    const colors = {
        movingAverage: "#000",
        confirmed: style.getPropertyValue("--clr-confirmed"),
        deaths: style.getPropertyValue("--clr-deaths"),
        vaccinated1: style.getPropertyValue("--clr-vaccinated-1"),
        vaccinated2: style.getPropertyValue("--clr-vaccinated-2")
    }
    const state = _data.vaccinatedInfo.extras[_ufs[_data.id]].info;
    
    const movingAverage = parseInt(_data.deaths[_data.deaths.length-1]["percentual_de_mortes_moveis"]);

    let trend;
    if(movingAverage > 15)
        trend = "em crescimento";
    else if(movingAverage < -15)
        trend = "em queda";
    else
        trend = "estável";

    _elements.deathsDescription.innerText = `A média móvel do ${_elements.selectStateSelected.innerText} está ${trend} (${movingAverage}%).`;

    const confirmedOptions = getChartOptions(
        [
            {
                name: "Média Móvel",
                type: "line",
                data: _data.confirmed.map(day => day["media_semanal"])
            },
            {
                name: "Confirmados",
                type: "column",
                data: _data.confirmed.map(day => day["variacao_absoluta_sobre_o_dia_anterior"])
            }
        ],
        _data.confirmed.map(day => day["data"]),
        [colors.movingAverage, colors.confirmed]
    );
    _charts.confirmed.updateOptions(confirmedOptions);

    const deathsOptions = getChartOptions(
        [
            {
                name: "Média Móvel",
                type: "line",
                data: _data.deaths.map(day => day["media_semanal"])
            },
            {
                name: "Mortes",
                type: "column",
                data: _data.deaths.map(day => day["variacao_absoluta_sobre_o_dia_anterior"])
            }
        ],
        _data.deaths.map(day => day["data"]),
        [colors.movingAverage, colors.deaths]
    );
    _charts.deaths.updateOptions(deathsOptions);

    const vaccinatedOptions = getChartOptions(
        [
            {
                name: "1º dose",
                type: "line",
                data: _data.vaccinated.map(day => day["total_hoje_dose_1"])
            },
            {
                name: "2ºdose + dose única",
                type: "line",
                data: _data.vaccinated.map(day => day["total_hoje_dose_2"] + day["total_hoje_dose_unica"])
            }
        ],
        _data.vaccinated.map(day => day["data"]),
        [colors.vaccinated1, colors.vaccinated2]
    );
    _charts.vaccinatedAbs.updateOptions(vaccinatedOptions);

    const confirmed30Data = _data.confirmed.slice(_data.confirmed.length - 30);
    const confirmed30Options = getChartOptions(
        [
            {
                name: "Média Móvel",
                type: "line",
                data: confirmed30Data.map(day => day["media_semanal"])
            },
            {
                name: "Confirmados",
                type: "column",
                data: confirmed30Data.map(day => day["variacao_absoluta_sobre_o_dia_anterior"])
            }
        ],
        confirmed30Data.map(day => day["data"]),
        [colors.movingAverage, colors.confirmed]
    );
    _charts.confirmed30.updateOptions(confirmed30Options);

    const vaccinatedDayOptions = getChartOptions(
        [
            {
                name: "1º dose",
                data: _data.vaccinated.map(day => day["hoje_dose_1"])
            },
            {
                name: "2º dose + dose única",
                data: _data.vaccinated.map(day => day["hoje_dose_2"])
            }
        ],
        _data.vaccinated.map(day => day["data"]),
        [colors.vaccinated1, colors.vaccinated2]
    );
    _charts.vaccinatedDay.updateOptions(vaccinatedDayOptions);

    const vaccinated1Options = getDonutChartOptions(
        state["total-pct-vacinados-dose-1"],
        "1º dose",
        [style.getPropertyValue("--clr-vaccinated-1")]
    );
    _charts.vaccinatedDonut1.updateOptions(vaccinated1Options);

    const vaccinated2Options = getDonutChartOptions(
        state["total-pct-vacinados-dose-2"],
        "2º dose + dose única",
        [style.getPropertyValue("--clr-vaccinated-2")]
    );
    _charts.vaccinatedDonut2.updateOptions(vaccinated2Options);
}

const getChartOptions = (series, labels, colors) => {
    const options = {
        series: series,
        labels: labels,
        colors: colors,
        theme: {
            mode: document.documentElement.getAttribute("data-theme")
        }
    };

    return options;
}

const getDonutChartOptions = (value, name, colors) => {
    const style = getComputedStyle(document.documentElement);
    const options = {
        series: [parseInt(value * 100)],
        labels: [name],
        colors: colors,

        theme: {
            mode: document.documentElement.getAttribute("data-theme")
        },

        plotOptions: {
            radialBar: {
                track: {
                    background: style.getPropertyValue("--clr-background")
                }
            }
        }
    }

    return options;
}

loadData(_data.id);
createCharts();