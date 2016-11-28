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
		  	},
			{ test: /\.(eot|svg|ttf|woff|woff2)$/,
			  loader: 'file?name=../[name].[ext]'
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
		}),
		new ExtractTextPlugin("./dist/app.min.css"),
		new webpack.optimize.UglifyJsPlugin({
			compress: { warnings: false },
			output: { comments: false }
		})
	]
};
