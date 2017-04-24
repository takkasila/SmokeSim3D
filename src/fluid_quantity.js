export default class FluidQuantity
{
    constructor(width, height, tall, cellSize)
    {
        this.width = width
        this.height = height
        this.tall = tall
        this.cellSize = cellSize
        this.totalBlock = (this.width + 2) * (this.height + 2) * (this.tall + 2)
        this.data_prev = new Array()
        this.data_prev.length = this.totalBlock
        this.data = new Array()
        this.data.length = this.totalBlock
        this.data_prev.fill(0)
        this.data.fill(0)
    }

    add_source(x_begin, x_end, y_begin, y_end, z_begin, z_end, value)
    {
        var ix_begin = Math.round(x_begin*(this.width-1) + 1)
        var ix_end = Math.round(x_end*(this.width-1) + 1)
        var iy_begin = Math.round(y_begin*(this.tall-1) + 1)
        var iy_end = Math.round(y_end*(this.tall-1) + 1)
        var iz_begin = Math.round(z_begin*(this.height-1) + 1)
        var iz_end = Math.round(z_end*(this.height-1) + 1)
        
        for(var i=ix_begin; i<=ix_end; i++)
            for(var j=iy_begin; j<=iy_end; j++)
                for(var k=iz_begin; k <=iz_end; k++)
                    this.data_prev[i+k*(this.width+2)+j*(this.width+2)*(this.height+2)] = value
    }
};
