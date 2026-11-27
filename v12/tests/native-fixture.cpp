#include "../../versions/v11/RhythmModel.h"
#include <iostream>
#include <iomanip>
int main(){using namespace RhythmV11;std::cout<<std::setprecision(17)<<"[";bool first=true;for(int meter=0;meter<10;meter++)for(bool helix:{false,true}){Settings s;s.meter=meter;s.helix=helix;s.startRight=true;auto g=generate(s);if(!first)std::cout<<",";first=false;std::cout<<"{\"meter\":"<<meter<<",\"helix\":"<<(helix?"true":"false")<<",\"points\":[";for(size_t i=0;i<g.path.size();i++){if(i)std::cout<<",";const auto&k=g.path[i];std::cout<<"["<<k.sample.p.x<<","<<k.sample.p.y<<","<<k.sample.p.z<<","<<k.sample.n.x<<","<<k.sample.n.y<<","<<k.sample.n.z<<","<<k.birth<<"]";}std::cout<<"]}";}std::cout<<"]\n";}
