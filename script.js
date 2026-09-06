const stocks = ["AMZN", "GOOG", "AAPL", "TSLA", "NVDA", "MSFT", "NFLX"];
const stock_data = {};

let selected_stock = "";
let current_simulation = null;

const parse_date = d3.timeParse("%Y-%m-%d");
const screen_div = document.getElementById("screen");
const empty_state = document.getElementById("empty-state");
const rerun_button = document.getElementById("rerun");
const summary_box = document.getElementById("summary");
const simulation_count_box = document.getElementById("simulation-count");
const selected_stock_text = document.getElementById("selected-stock");

const normal_random_number = function () {
  let first_random_number = Math.random();
  let second_random_number = Math.random();

  if (first_random_number === 0) {
    first_random_number = 0.0001;
  }

  let random_number = Math.sqrt(-2 * Math.log(first_random_number));
  random_number = random_number * Math.cos(2 * Math.PI * second_random_number);

  return random_number;
};

const make_simulation = function (all_stock_data) {
  let data_2019 = [];
  let data_2020 = [];

  for (let row_number = 0; row_number < all_stock_data.length; row_number++) {
    let row_year = all_stock_data[row_number].Date.getFullYear();

    if (row_year === 2019) {
      data_2019.push(all_stock_data[row_number]);
    }

    if (row_year === 2020) {
      data_2020.push(all_stock_data[row_number]);
    }
  }

  if (data_2019.length < 2 || data_2020.length === 0) {
    throw new Error("Not enough stock data");
  }

  let daily_returns = [];

  for (let return_number = 1; return_number < data_2019.length; return_number++) {
    let old_price = data_2019[return_number - 1].Close;
    let new_price = data_2019[return_number].Close;
    let daily_return = Math.log(new_price / old_price);
    daily_returns.push(daily_return);
  }

  let return_total = 0;

  for (let return_number = 0; return_number < daily_returns.length; return_number++) {
    return_total = return_total + daily_returns[return_number];
  }

  let average_daily_return = return_total / daily_returns.length;
  let difference_total = 0;

  for (let return_number = 0; return_number < daily_returns.length; return_number++) {
    let difference = daily_returns[return_number] - average_daily_return;
    difference_total = difference_total + Math.pow(difference, 2);
  }

  let daily_volatility = Math.sqrt(difference_total / (daily_returns.length - 1));
  let last_2019_price = data_2019[data_2019.length - 1];
  let real_price_line = [{ Date: last_2019_price.Date, Close: last_2019_price.Close }];

  for (let day_number = 0; day_number < data_2020.length; day_number++) {
    real_price_line.push({
      Date: data_2020[day_number].Date,
      Close: data_2020[day_number].Close
    });
  }

  let amount_of_simulations = Number(simulation_count_box.value);

  if (amount_of_simulations < 1) {
    amount_of_simulations = 1;
  }

  let combined_prices = [];

  for (let day_number = 0; day_number < data_2020.length; day_number++) {
    combined_prices.push(0);
  }

  for (let simulation_number = 0; simulation_number < amount_of_simulations; simulation_number++) {
    let simulated_price = last_2019_price.Close;

    for (let day_number = 0; day_number < data_2020.length; day_number++) {
      let random_movement = normal_random_number() * daily_volatility;
      simulated_price = simulated_price * Math.exp(average_daily_return + random_movement);
      combined_prices[day_number] = combined_prices[day_number] + simulated_price;
    }
  }

  let monte_carlo_line = [{ Date: last_2019_price.Date, Close: last_2019_price.Close }];

  for (let day_number = 0; day_number < data_2020.length; day_number++) {
    let average_simulated_price = combined_prices[day_number] / amount_of_simulations;

    monte_carlo_line.push({
      Date: data_2020[day_number].Date,
      Close: average_simulated_price
    });
  }

  return {
    real_price_line: real_price_line,
    monte_carlo_line: monte_carlo_line,
    amount_of_simulations: amount_of_simulations
  };
};

const draw_graph = function (simulation_result) {
  empty_state.style.display = "none";
  d3.select("#screen").selectAll("svg").remove();

  let screen_size = screen_div.getBoundingClientRect();
  let graph_margin = { top: 25, right: 80, bottom: 45, left: 30 };
  let graph_width = screen_size.width - graph_margin.left - graph_margin.right;
  let graph_height = screen_size.height - graph_margin.top - graph_margin.bottom;

  if (graph_width < 300) {
    graph_width = 300;
  }

  if (graph_height < 220) {
    graph_height = 220;
  }

  let graph_svg = d3.select("#screen")
    .append("svg")
    .attr("width", screen_size.width)
    .attr("height", screen_size.height)
    .append("g")
    .attr("transform", "translate(" + graph_margin.left + "," + graph_margin.top + ")");

  let both_price_lines = simulation_result.real_price_line.concat(simulation_result.monte_carlo_line);

  let x_axis_scale = d3.scaleTime()
    .domain(d3.extent(simulation_result.real_price_line, function (price_point) {
      return price_point.Date;
    }))
    .range([0, graph_width]);

  let lowest_price = d3.min(both_price_lines, function (price_point) {
    return price_point.Close;
  });

  let highest_price = d3.max(both_price_lines, function (price_point) {
    return price_point.Close;
  });

  let price_padding = (highest_price - lowest_price) * 0.08;

  if (price_padding < highest_price * 0.02) {
    price_padding = highest_price * 0.02;
  }

  let y_axis_scale = d3.scaleLinear()
    .domain([Math.max(0, lowest_price - price_padding), highest_price + price_padding])
    .nice()
    .range([graph_height, 0]);

  let bottom_grid = d3.axisBottom(x_axis_scale)
    .ticks(d3.timeMonth.every(1))
    .tickSize(-graph_height)
    .tickFormat("");

  let side_grid = d3.axisLeft(y_axis_scale)
    .ticks(10)
    .tickSize(-graph_width)
    .tickFormat("");

  graph_svg.append("g")
    .attr("class", "grid")
    .attr("transform", "translate(0," + graph_height + ")")
    .call(bottom_grid);

  graph_svg.append("g")
    .attr("class", "grid")
    .call(side_grid);

  graph_svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(0," + graph_height + ")")
    .call(d3.axisBottom(x_axis_scale).ticks(d3.timeMonth.every(1)).tickFormat(d3.timeFormat("%b")));

  graph_svg.append("g")
    .attr("class", "axis")
    .attr("transform", "translate(" + graph_width + ",0)")
    .call(d3.axisRight(y_axis_scale).ticks(10).tickFormat(function (price) {
      return "$" + d3.format(",.0f")(price);
    }));

  let price_line = d3.line()
    .x(function (price_point) {
      return x_axis_scale(price_point.Date);
    })
    .y(function (price_point) {
      return y_axis_scale(price_point.Close);
    });

  graph_svg.append("path")
    .datum(simulation_result.real_price_line)
    .attr("fill", "none")
    .attr("stroke", "#2ca02c")
    .attr("stroke-width", 2.5)
    .attr("d", price_line);

  graph_svg.append("path")
    .datum(simulation_result.monte_carlo_line)
    .attr("fill", "none")
    .attr("stroke", "#1f77b4")
    .attr("stroke-width", 2.5)
    .attr("d", price_line);

  let real_line_end = simulation_result.real_price_line[simulation_result.real_price_line.length - 1];
  let monte_carlo_line_end = simulation_result.monte_carlo_line[simulation_result.monte_carlo_line.length - 1];

  graph_svg.append("text")
    .attr("x", graph_width - 4)
    .attr("y", y_axis_scale(real_line_end.Close) - 7)
    .attr("text-anchor", "end")
    .attr("fill", "#2ca02c")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text("TRUE $" + real_line_end.Close.toFixed(2));

  graph_svg.append("text")
    .attr("x", graph_width - 4)
    .attr("y", y_axis_scale(monte_carlo_line_end.Close) - 7)
    .attr("text-anchor", "end")
    .attr("fill", "#1f77b4")
    .attr("font-size", 12)
    .attr("font-weight", 700)
    .text("MC AVG $" + monte_carlo_line_end.Close.toFixed(2));
};

const show_result = function (simulation_result) {
  let real_line_end = simulation_result.real_price_line[simulation_result.real_price_line.length - 1].Close;
  let monte_carlo_line_end = simulation_result.monte_carlo_line[simulation_result.monte_carlo_line.length - 1].Close;
  let price_difference = ((monte_carlo_line_end - real_line_end) / real_line_end) * 100;
  let above_or_below = "above";

  if (price_difference < 0) {
    above_or_below = "below";
  }

  let simulation_text = "simulation";

  if (simulation_result.amount_of_simulations > 1) {
    simulation_text = "average of " + simulation_result.amount_of_simulations + " simulations";
  }

  summary_box.textContent = selected_stock + ": true 2020 close $" + real_line_end.toFixed(2) +
    " · " + simulation_text + " $" + monte_carlo_line_end.toFixed(2) +
    " (" + Math.abs(price_difference).toFixed(1) + "% " + above_or_below + " true price)";
};

const run_simulation = function () {
  if (selected_stock === "") {
    return;
  }

  try {
    current_simulation = make_simulation(stock_data[selected_stock]);
    draw_graph(current_simulation);
    show_result(current_simulation);
  } catch (error) {
    console.log(error);
    summary_box.textContent = "There was not enough data to run this simulation.";
  }
};

const choose_stock = function (stock_symbol) {
  selected_stock = stock_symbol;
  selected_stock_text.textContent = stock_symbol;
  rerun_button.disabled = false;

  let stock_buttons = document.querySelectorAll(".stockpricecont");

  for (let button_number = 0; button_number < stock_buttons.length; button_number++) {
    if (stock_buttons[button_number].dataset.stock === stock_symbol) {
      stock_buttons[button_number].classList.add("selected");
    } else {
      stock_buttons[button_number].classList.remove("selected");
    }
  }

  run_simulation();
};

const load_stock_data = async function () {
  try {
    for (let stock_number = 0; stock_number < stocks.length; stock_number++) {
      let stock_symbol = stocks[stock_number];
      let stock_rows = await d3.csv("data/" + stock_symbol + ".csv");

      for (let row_number = 0; row_number < stock_rows.length; row_number++) {
        stock_rows[row_number].Date = parse_date(stock_rows[row_number].Date);
        stock_rows[row_number].Close = Number(stock_rows[row_number].Close);
      }

      stock_rows.sort(function (first_row, second_row) {
        return first_row.Date - second_row.Date;
      });

      stock_data[stock_symbol] = stock_rows;

      let last_real_price = null;

      for (let row_number = 0; row_number < stock_rows.length; row_number++) {
        if (stock_rows[row_number].Date.getFullYear() === 2020) {
          last_real_price = stock_rows[row_number].Close;
        }
      }

      if (last_real_price !== null) {
        document.getElementById(stock_symbol + "price").textContent = "$" + last_real_price.toFixed(2);
      }
    }

    let stock_buttons = document.querySelectorAll(".stockpricecont");

    for (let button_number = 0; button_number < stock_buttons.length; button_number++) {
      stock_buttons[button_number].addEventListener("click", function () {
        choose_stock(this.dataset.stock);
      });
    }

    rerun_button.addEventListener("click", function () {
      run_simulation();
    });

    simulation_count_box.addEventListener("change", function () {
      if (selected_stock !== "") {
        run_simulation();
      }
    });
  } catch (error) {
    console.log(error);
    empty_state.textContent = "Could not load the stock data.";
  }
};

window.addEventListener("resize", function () {
  if (current_simulation !== null) {
    draw_graph(current_simulation);
  }
});

load_stock_data();
