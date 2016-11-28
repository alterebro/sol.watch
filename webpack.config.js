const webpack = require('webpack');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const ExtractTextPlugin = require("extract-text-webpack-plugin");

module.exports = {
	context: __dirname,
	entry: "./src/app.js",
	output: {
		path: __dirname,
		filename: "./dist/app.min.js",
	},
	module: {
		loaders: [
			{ test: /\.css$/, loader: ExtractTextPlugin.extract("style-loader", "css-loader") },
		    { test: /\.js$/,
		      exclude: /(node_modules|bower_components|dist)/,
		      loader: 'babel-loader',
		      query: { presets: ['es2015'] }
		  	}
        ]
	},
	resolve: {
		alias: {
			'vue$': 'vue/dist/vue.js'
		}
	},
	plugins: [
		new HtmlWebpackPlugin({
			template: './src/app.html',
			inject: 'body',
			filename: 'index.html',
			minify: {collapseWhitespace: true, removeComments: true},

			title: 'SolWatch. GeoPosition-based Sun Clock',
			description: 'Sol Watch is a Sun clock that calculates the solar phases depending of your current geographical coordinates'
		}),
		new ExtractTextPlugin("./dist/app.min.css"),
		new webpack.optimize.UglifyJsPlugin({
			compress: { warnings: false },
			output: { comments: false }
		})
	]
};
