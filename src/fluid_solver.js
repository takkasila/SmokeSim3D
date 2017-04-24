import FluidQuantity from './fluid_quantity'

export default class FluidSolver
{
    /**
     * Width: x; Tall: y; Height: z
     */
    constructor(width, tall, height, diffusion_rate)
    {
        this.width = width
        this.height = height
        this.tall = tall
        this.diffusion_rate = diffusion_rate
        this.cellSize = 1.0/Math.min(width, height, tall)

        this.dense = new FluidQuantity(this.width, this.height, this.tall, this.cellSize)
        this.speed_x = new FluidQuantity(this.width, this.height, this.tall, this.cellSize)
        this.speed_y = new FluidQuantity(this.width, this.height, this.tall, this.cellSize)
        this.speed_z = new FluidQuantity(this.width, this.height, this.tall, this.cellSize)

        this.totalBlock = (this.width + 2) * (this.height + 2) * (this.tall + 2)
        this.p = new Array()
        this.p.length = this.totalBlock
        this.p.fill(0.0)
        this.div = new Array()
        this.div.length = this.totalBlock
        this.div.fill(0.0)

        this.denseUI8 = new Uint8Array(this.width * this.height * this.tall)
    }

    update(timeStep)
    {
        this.velocityStep(timeStep)
        this.densityStep(timeStep)
        this.updateDenseUI8()
    }

    velocityStep(timeStep)
    {
        this.diffuse(this.speed_x.data, this.speed_x.data_prev, timeStep, true, false, false)
        this.diffuse(this.speed_y.data, this.speed_y.data_prev, timeStep, false, true, false)
        this.diffuse(this.speed_z.data, this.speed_z.data_prev, timeStep, false, false, true)
        this.project(this.speed_x.data, this.speed_y.data, this.speed_z.data)
        this.advect(this.speed_x.data_prev, this.speed_x.data, this.speed_x.data, this.speed_y.data, this.speed_z.data, timeStep, true, false, false)
        this.advect(this.speed_y.data_prev, this.speed_y.data, this.speed_x.data, this.speed_y.data, this.speed_z.data, timeStep, false, true, false)
        this.advect(this.speed_z.data_prev, this.speed_z.data, this.speed_x.data, this.speed_y.data, this.speed_z.data, timeStep, false, true, false)
        this.project(this.speed_x.data_prev, this.speed_y.data_prev, this.speed_z.data_prev)
        this.SWAP(this.speed_x.data, this.speed_x.data_prev)
        this.SWAP(this.speed_y.data, this.speed_y.data_prev)
        this.SWAP(this.speed_z.data, this.speed_z.data_prev)
    }

    densityStep(timeStep)
    {
        this.diffuse(this.dense.data, this.dense.data_prev, timeStep, false, false, false)
        this.advect(this.dense.data_prev, this.dense.data, this.speed_x.data, this.speed_y.data, this.speed_z.data, timeStep, false, false, false)
        this.SWAP(this.dense.data, this.dense.data_prev)
    }

    diffuse(data, data_prev, timeStep, u_cond, v_cond, w_cond)
    {
        var coeff1 = timeStep*this.diffusion_rate*this.width*this.height*this.tall
        var coeff2 = 1 + 6 * coeff1
        this.linear_solver(data, data_prev, coeff1, coeff2, u_cond, v_cond, w_cond)
    }

    advect(data, data_prev, u, v, w, timeStep, u_cond, v_cond, w_cond)
    {
        var x, y, z
        var i0, i1, j0, j1, k0, k1
        for (var k = 1; k <= this.height; k++)
            for (var j = 1; j <= this.tall; j++)
                for (var i = 1; i <= this.width; i++)
                {
                    //Traceback particle
                    x = i - u[this.AT(i, j, k)]*timeStep*this.width
                    y = j - v[this.AT(i, j, k)]*timeStep*this.tall
                    z = k - w[this.AT(i, j, k)]*timeStep*this.height
                    //Screen boundary condition
                    if (x < 0.5) x = 0.5
                    if (x > this.width + 0.5) x = this.width + 0.5
                    if (y < 0.5) y = 0.5
                    if (y > this.tall + 0.5) y = this.tall + 0.5
                    if (z < 0.5) z = 0.5
                    if (z > this.height + 0.5) z = this.height + 0.5
                    //Find four closest neighbor
                    i0 = Math.round(x)
                    i1 = i0 + 1
                    j0 = Math.round(y)
                    j1 = j0 + 1
                    k0 = Math.round(z)
                    k1 = k0 + 1
                    //Interpolate eight closest neighbor
                    data[this.AT(i, j, k)] = 
                        this.lerp(
                            // Face 1
                            this.lerp(
                                this.lerp(data_prev[this.AT(i0, j0, k0)], data_prev[i1, j0, k0], x-i0)
                                , this.lerp(data_prev[this.AT(i0, j1, k0)], data_prev[i1, j1, k0], x-i0)
                                , y-j0
                            )
                            ,
                            // Face 2
                            this.lerp(
                                this.lerp(data_prev[this.AT(i0, j0, k1)], data_prev[i1, j0, k1], x-i0)
                                , this.lerp(data_prev[this.AT(i0, j1, k1)], data_prev[i1, j1, k1], x-i0)
                                , y-j0
                            )
                            , z-k0
                        )
                }
		this.set_boundary(data, u_cond, v_cond, w_cond)
    }

    project(u, v, w)
    {
        for (var k = 1; k <= this.height; k++)
            for (var j = 1; j <= this.tall; j++)
                for (var i = 1; i <= this.width; i++)
                {
                    this.div[this.AT(i, j, k)] = -0.333333 * this.cellSize*(
                        u[this.AT(i+1, j, k)] - u[this.AT(i-1, j, k)]
                        + v[this.AT(i, j+1, k)] - v[this.AT(i, j-1, k)] 
                        + w[this.AT(i, j, k+1)] - w[this.AT(i, j, k-1)])
                    this.p[this.AT(i, j, k)] = 0
                }
        this.set_boundary(this.div, false, false, false)
        this.set_boundary(this.p, false, false, false)

        this.linear_solver(this.p, this.div, 1, 6, false, false, false)

        for (var k = 1; k <= this.height; k++)
            for (var j = 1; j <= this.tall; j++)
                for (var i = 1; i <= this.width; i++)
                {
                    u[this.AT(i, j, k)] -= 0.5*(this.p[this.AT(i+1, j, k)] - this.p[this.AT(i-1, j, k)])/this.cellSize
                    v[this.AT(i, j, k)] -= 0.5*(this.p[this.AT(i, j+1, k)] - this.p[this.AT(i, j-1, k)])/this.cellSize
                    w[this.AT(i, j, k)] -= 0.5*(this.p[this.AT(i, j, k+1)] - this.p[this.AT(i, j, k-1)])/this.cellSize
                }
        this.set_boundary(u, true, false, false)
        this.set_boundary(v, false, true, false)
        this.set_boundary(w, false, false, true)
    }

    linear_solver(data, data_prev, coeff1, coeff2, u_cond, v_cond, w_cond)
    {
        for (var step = 0; step < 20; step++)
        {
            for (var j = 1; j <= this.tall; j++)
                for (var k = 1; k <= this.height; k++)
                    for (var i = 1; i <= this.width; i++)
                    {
                        data[this.AT(i, j, k)] =
                            (
                            data_prev[this.AT(i, j, k)]
                            +
                            coeff1 *
                            (
                                data[this.AT(i-1, j  ,k  )] +
                                data[this.AT(i+1, j  ,k  )] +
                                data[this.AT(i  , j-1,k  )] +
                                data[this.AT(i  , j+1,k  )] +
                                data[this.AT(i  , j  ,k-1)] +
                                data[this.AT(i  , j  ,k+1)]
                            )
                            )
                            /(coeff2);
                    }
            this.set_boundary(data, u_cond, v_cond, w_cond);
        }
    }

    set_boundary(data, u_cond, v_cond, w_cond)
    {
        //Edge plane
		var coef_u = u_cond == true ? -1 : 1
		var coef_v = v_cond == true ? -1 : 1
        var coef_w = w_cond == true ? -1 : 1
        //xy plane, w cond
		for (var i = 1; i <= this.width; i++)
        for (var j = 1; j <= this.tall; j++)
		{
			data[this.AT(i, j, 0)] = data[this.AT(i, j, 1)] * coef_w
			data[this.AT(i, j, this.height + 1)] = data[this.AT(i, j, this.height)] * coef_w
		}
        //xz plane, v cond
        for (var i = 1; i <= this.width; i++)
		for (var k = 1; k <= this.height; k++)
		{
			data[this.AT(i, 0, k)] = data[this.AT(i, 1, k)] * coef_v
			data[this.AT(i, this.tall + 1, k)] = data[this.AT(i, this.tall, k)] * coef_v
		}
        //yz plane, u cond
        for (var j = 1; j <= this.tall; j++)
        for (var k = 1; k <= this.height; k++)
        {
            data[this.AT(0, j, k)] = data[this.AT(1, j, k)] * coef_u
            data[this.AT(this.width + 1, j, k)] = data[this.AT(this.width, j, k)] * coef_u
        }
		//Corner
        //0     , 0     , 0
        data[this.AT(0, 0, 0)] = (data[this.AT(1, 0, 0) + data[this.AT(0, 1, 0)]] + data[this.AT(0, 0, 1)]) / 3
        //width , 0     , 0
        data[this.AT(this.width+1, 0, 0)] = (data[this.AT(this.width, 0, 0)] + data[this.AT(this.width+1, 1, 0)] + data[this.AT(this.width+1, 0, 1)]) / 3
        //0     , tall  , 0
        data[this.AT(0, this.tall+1, 0)] = (data[this.AT(1, this.tall+1, 0)] + data[this.AT(0, this.tall, 0)] + data[this.AT(0, this.tall+1, 1)]) / 3
        //width , tall  , 0
        data[this.AT(this.width+1, this.tall+1, 0)] = (data[this.AT(this.width, this.tall+1, 0)] + data[this.AT(this.width+1, this.tall, 0)] + data[this.AT(this.width+1, this.tall+1, 1)]) / 3
        //0     , 0     , height
        data[this.AT(0, 0, this.height+1)] = (data[this.AT(1, 0, this.height+1)] + data[this.AT(0, 1, this.height+1)] + data[this.AT(0, 0, this.height)]) / 3
        //width , 0     , height
        data[this.AT(this.width+1, 0, this.height+1)] = (data[this.AT(this.width, 0, this.height+1)] + data[this.AT(this.width+1, 1, this.height+1)] + data[this.AT(this.width+1, 0, this.height)]) / 3
        //0     , tall  , height
        data[this.AT(0, this.tall+1, this.height+1)] = (data[this.AT(1, this.tall+1, this.height+1)] + data[this.AT(0, this.tall, this.height+1)] + data[this.AT(0, this.tall+1, this.height)]) / 3
        //width , tall  , height
        data[this.AT(this.width+1, this.tall+1, this.height+1)] = (data[this.AT(this.width, this.tall+1, this.height+1)] + data[this.AT(this.width+1, this.tall, this.height+1)] + data[this.AT(this.width+1, this.tall+1, this.height)]) / 3
    }

    add_flow(x_begin, x_end, y_begin, y_end, z_begin, z_end, dense, speed_x, speed_y, speed_z)
    {
        this.dense.add_source(x_begin, x_end, y_begin, y_end, z_begin, z_end, dense)
        this.speed_x.add_source(x_begin, x_end, y_begin, y_end, z_begin, z_end, speed_x)
        this.speed_y.add_source(x_begin, x_end, y_begin, y_end, z_begin, z_end, speed_y)
        this.speed_z.add_source(x_begin, x_end, y_begin, y_end, z_begin, z_end, speed_z)
    }

    AT(i, j, k)
    {
        return i+k*(this.width+2)+j*(this.width+2)*(this.height+2)
    }

    SWAP(a, b)
    {
        var temp = a
        a = b
        b = temp
    }

    lerp(a, b, amount)
    {
        return a + (b-a) * Math.min( Math.max(amount, 0), 1)
    }

    updateDenseUI8()
    {
        var count =0;
        for(var y = 1; y <= this.tall; y++)
        for(var z = 1; z <= this.height; z++)
        for(var x = 1; x <= this.width; x++)
        {
            this.denseUI8[count] = this.dense.data[this.AT(x, y, z)] * 255;
            count ++;
        }
    }

    reset()
    {
        this.dense.reset()
        this.speed_x.reset()
        this.speed_y.reset()
        this.speed_z.reset()
        updateDenseUI8()
    }

};
