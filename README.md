# Monte Carlo Stock Simulator

I made this to compare a Monte Carlo stock-price simulation with what actually happened to the stock afterwards.

The program uses each stock's 2019 daily prices to work out its average log return and volatility. It then starts at the final 2019 price and simulates possible paths through 2020. You can choose how many simulations to run and the blue line is the average of those paths. The real 2020 price is drawn on the same graph.

Using 1 simulation gives the original random path. Using more simulations makes the average less dependent on one random run, although it does not mean it will necessarily match the real 2020 price better.

Click one of the stocks at the bottom to run it. Change the number of simulations or use `Run simulation again` to generate a new result.

## Running it

The CSV files are loaded by the browser, so it is best to run the folder through a small local web server instead of opening `index.html` directly.

For example:

```bash
python -m http.server
```

Then open `http://localhost:8000`.

## Limitations

This is a simple model. It assumes the behaviour measured in 2019 continues into 2020, so it does not know about news, crashes or changes in volatility. The point is to see how a basic Monte Carlo model compares with the real price rather than use it as a real trading prediction.
