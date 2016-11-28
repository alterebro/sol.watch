import Vue 		from 'vue'
import ajax 	from '@fdaciuk/ajax'
import SunCalc 	from './lib/suncalc.custom'
import './app.css'

new Vue({

	el : '#app',

	data : {
		app_ready : false,
		geoposition : {},
		now : {},
		cycle : {},
		stages : {},
		config : {
			latitude : 41.6453,
			longitude : -0.8849,
			location : 'Zaragoza, Spain',
			refresh_rate : (240000/360),
			svg_size : 400
		},
		current_class : 'day',
		show_sidebar : false
	},

	created() {

		this.geoPosition();
	},

	watch : {

		app_ready(val) {
			if ( val === true ) {
				this.init_app()
				this.update()
			} else {
				this.reset_app()
			}
		}

	},

	computed : {
		current_stage() {
			let current_stage = false
			for (let s in this.stages) {
				if ( this.stages[s].to >= this.now.degrees) {
					current_stage = this.stages[s]
					break;
				}
			}
			if ( !!current_stage ) { this.current_class = current_stage.class }
			return current_stage;
		}
	},
	methods : {

		init_app() {

			let data = this.getData()
			this.cycle = data.cycle
			this.stages = data.stages
		},

		reset_app() {

			this.now = {}
			this.cycle = {}
			this.stages = {}
		},

		sidebar() {

			this.show_sidebar = !this.show_sidebar;
		},

		forceGeoPosition() {

			this.geoPosition(true)
			this.sidebar()
		},

		geoPosition( remove_cache = false ) {

			this.geoposition = {};
			this.app_ready = false;

			let lat, lng, loc;
			const webServiceLocation = function() {

				const req = ajax().get('//freegeoip.net/json/')
				const timeout = setTimeout( () => {
  						req.abort()
					}, 5000) // 10 secs
					req.then((res, xhr) => {
	  					lat = res.latitude,
	  					lng = res.longitude,
	  					loc = [res.city, res.country_name].join(', ')
	  					output()
						clearTimeout(timeout)
	  				})
					req.catch(()=>{ output() })

			}

			const output = function() {

				let pos = {}

				if ( !!lat && !!lng ) {
					pos.latitude = lat
					pos.longitude = lng
					pos.location = loc || false
					if ( !!loc ) {
						// All data taken, cache it to localstorage
						localStorage.setItem('dawn.clock.geoposition.values', JSON.stringify(pos));
					}
				} else {
					// Error getting position. Show defaults or cached and alert.
					let local = localStorage.getItem('dawn.clock.geoposition.values')
					pos = (!!local) ? JSON.parse(local) : {
						latitude: this.config.latitude,
						longitude: this.config.longitude,
						location: this.config.location
					}
					// TODO : modify user warning
					let msg = (!!local) ? 'Previous cached values' : 'Default values';
					window.alert( `Error geolocating. ${msg} will be used` )
				}

				this.geoposition = pos;
				this.app_ready = true;

			}.bind(this)

			// Cache location
			if ( remove_cache ) { localStorage.removeItem('dawn.clock.geoposition.values');	}

			let stored = localStorage.getItem('dawn.clock.geoposition.values')
			if ( !!stored ) {
				this.geoposition = JSON.parse(stored)
				this.app_ready = true;
				return;
			}

			if (navigator.geolocation) {
				navigator.geolocation.getCurrentPosition(
					(position) => {
						lat = position.coords.latitude
						lng = position.coords.longitude

						let url = "https://maps.googleapis.com/maps/api/geocode/json?";
							url += [`latlng=${lat},${lng}`, 'key=AIzaSyDr5iaE3WgRMxisUCvyKOUhYmPG6y402vI'].join('&');


						const req = ajax().get(url)
						const timeout = setTimeout( () => {
		  						req.abort()
							}, 5000)
							req.then((res) => {
								let response = res.results[0].address_components;
								let address = [];
								for ( let i=0; i<response.length; i++ ) {
									if ( response[i].types[0] == 'locality' ) address.push( (response[i].long_name != '' ) ? response[i].long_name : 'Somewhere' )
									if ( response[i].types[0] == 'country' ) address.push( response[i].long_name )
								}
								loc = ( address.length == 2 ) ? address.join(', ') : res.results[0].formatted_address;
								output()
								clearTimeout(timeout)
			  				})
							req.catch(()=>{ output() })

					},
					(error) => { webServiceLocation() }
				)
			} else { webServiceLocation() }
		},

		getData() {

			let now = new Date()
			let events = SunCalc.getTimes(now, this.geoposition.latitude, this.geoposition.longitude)
			const cycle = {
				start : events.nadir,
				end : events.solarMidnight,
				duration : (3600*24*1000),
				block : (3600*24*1000) / 360,
			}
			const phases = [
				{phase: 'night_m', 		from: 'nadir', 		to: 'dawn' },
				{phase: 'twilight_m', 	from: 'dawn',		to: 'sunrise' },
				{phase: 'day_m', 		from: 'sunrise',	to: 'solarNoon' },
				{phase: 'day_e', 		from: 'solarNoon',	to: 'sunset' },
				{phase: 'twilight_e', 	from: 'sunset',		to: 'dusk' },
				{phase: 'night_e', 		from: 'dusk',		to: 'solarMidnight' },
			];

			let stages = {};
			for ( let i=0; i<phases.length; i++ ) {
				stages[ phases[i].phase ] = {
					from : Math.round((events[ phases[i].from ] - cycle.start) / cycle.block),
					to : Math.round((events[ phases[i].to ] - cycle.start) / cycle.block),
					end : phases[i].to,
					class : phases[i].phase.split('_')[0]
				};
			}

			return { events, cycle, stages }
		},

		update() {

			if (this.app_ready) {

				let freeze = Date.now()
				let degrees = ((freeze - this.cycle.start)/this.cycle.block)
					degrees = degrees%360;

				// Init when solar day ends
				if ( (this.cycle.end - freeze) < 0 ) { this.init_app() }

				this.now = {
					time : freeze,
					degrees : Math.floor(degrees),
					rest : Math.floor((degrees - Math.floor(degrees)) * 360)
				}
				setTimeout( this.update, this.config.refresh_rate )
			}
		},

		// drawing
		rot(deg = 0) {
			return 'rotate('+parseInt(deg)+' '+(this.config.svg_size/2)+' '+(this.config.svg_size/2)+')';
		},

		arc( start_deg=0, end_deg=0, inc=0 ) {

			function polarToCartesian(centerX, centerY, radius, angleInDegrees) {
				let angleInRadians = (angleInDegrees-90) * Math.PI / 180.0;
				return {
					x: centerX + (radius * Math.cos(angleInRadians)),
					y: centerY + (radius * Math.sin(angleInRadians))
				}
			}

			let size = this.config.svg_size/2
			let x = size,
				y = size,
				radius = size;

			let start = polarToCartesian(x, y, radius+inc, end_deg);
			let end = polarToCartesian(x, y, radius+inc, start_deg);
			let largeArcFlag = end_deg - start_deg <= 180 ? "0" : "1";

			return [
				"M", start.x, start.y,
				"A", radius+inc, radius+inc, 0, largeArcFlag, 0, end.x, end.y,
				"L", x, y, "Z"
			].join(" ");
		},

	},

	filters : {

		leading_zeros(v = 0) {
			return ("00" + (v || 0).toString()).slice(-3);
		},
		eventize(str = '') {
			return str.replace(/([A-Z])/g, ' $1').replace(/^./, function(s){
				return s.toUpperCase();
			});
		}

	}
})
