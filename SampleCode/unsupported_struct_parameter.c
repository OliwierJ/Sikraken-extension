struct Point
{
    int x;
    int y;
};

int point_distance_squared(struct Point point)
{
    return point.x * point.x + point.y * point.y;
}

